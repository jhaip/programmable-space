package main

import (
	"bufio"
	"bytes"
	"crypto/rand"
	"encoding/json"
	"encoding/base64"
	"errors"
	"fmt"
	"image"
	"image/color"
	"github.com/nfnt/resize"
	"image/png"
	"io"
	"log"
	"math"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"

	"gocv.io/x/gocv"
	ciede2000 "github.com/mattn/go-ciede2000"
	zmq "github.com/pebbe/zmq4"
)

const dotSize = 12
const NOT_SEEN_PAPER_COUNT_THRESHOLD = 2
const PER_CORNER_DISTANCE_DIFF_THRESHOLD = 5
const TOTAL_CORNER_DISTANCE_SQ_DIFF_THESHOLD = 4 * PER_CORNER_DISTANCE_DIFF_THRESHOLD * PER_CORNER_DISTANCE_DIFF_THRESHOLD

type Vec struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type Dot struct {
	X         int    `json:"x"`
	Y         int    `json:"y"`
	Color     [3]int `json:"color"`
	Neighbors []int  `json:"-"`
}

type Corner struct {
	Corner        Dot      `json:"corner"`
	lines         [][]int  `json:"-"`
	sides         [][]int  `json:"-"`
	PaperId       int      `json:"paperId"`
	CornerId      int      `json:"cornerId"`
	ColorString   string   `json:"colorString"`
	RawColorsList [][3]int `json:"rawColorsList"`
}

type PaperCorner struct {
	X        int `json:"x"`
	Y        int `json:"y"`
	CornerId int
}

type Paper struct {
	Id      string        `json:"id"`
	Corners []PaperCorner `json:"corners"`
}

type PaperCache struct {
	Paper			Paper
	NotSeenCount	int
}

type P struct {
	G     [][]int
	U     []int
	score float64
}

type BatchMessage struct {
	Type string     `json:"type"`
	Fact [][]string `json:"fact"`
}

func checkErr(err error) {
	if err != nil {
		log.Fatal(err)
		panic(err)
	}
}

func GetBasePath() string {
	envBasePath := os.Getenv("DYNAMIC_ROOT")
	if envBasePath != "" {
		return envBasePath + "/src/standalone_processes/"
	}
	env := "HOME"
	if runtime.GOOS == "windows" {
		env = "USERPROFILE"
	} else if runtime.GOOS == "plan9" {
		env = "home"
	}
	return os.Getenv(env) + "/lovelace/src/standalone_processes/"
}

// Copied from https://play.golang.org/p/4FkNSiUDMg
func newUUID() (string, error) {
	uuid := make([]byte, 16)
	n, err := io.ReadFull(rand.Reader, uuid)
	if n != len(uuid) || err != nil {
		return "", err
	}
	// variant bits; see section 4.1.1
	uuid[8] = uuid[8]&^0xc0 | 0x80
	// version 4 (pseudo-random); see section 4.1.3
	uuid[6] = uuid[6]&^0xf0 | 0x40
	return fmt.Sprintf("%x-%x-%x-%x-%x", uuid[0:4], uuid[4:6], uuid[6:8], uuid[8:10], uuid[10:]), nil
}

func initZeroMQ(MY_ID_STR string) *zmq.Socket {
	log.Println("Connecting to server...")
	client, zmqCreationErr := zmq.NewSocket(zmq.DEALER)
	checkErr(zmqCreationErr)
	setIdentityErr := client.SetIdentity(MY_ID_STR)
	checkErr(setIdentityErr)
	rpc_url := os.Getenv("PROG_SPACE_SERVER_URL")
	if rpc_url == "" {
		rpc_url = "localhost"
	}
	connectErr := client.Connect("tcp://" + rpc_url + ":5570")
	checkErr(connectErr)

	init_ping_id, err := newUUID();
	checkErr(err)
	client.SendMessage(fmt.Sprintf(".....PING%s%s", MY_ID_STR, init_ping_id))
	// block until ping response received
	_, recvErr := client.RecvMessage(0) 
	checkErr(recvErr);
	
	return client
}

func main() {
	BASE_PATH := GetBasePath()

	/*** Set up logging ***/
	LOG_PATH := BASE_PATH + "logs/1601__dots-to-papers.log"
	f, err := os.OpenFile(LOG_PATH, os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
	if err != nil {
		log.Fatalf("error opening file: %v", err)
	}
	defer f.Close()

	log.SetOutput(f)
	// log.Println("This is a test log entry")
	/*** /end logging setup ***/

	dotCodes8400 := get8400(BASE_PATH + "files/dot-codes.txt")
	if len(dotCodes8400) != 8400 {
		panic("DID NOT GET 8400 DOT CODES")
	}

	MY_ID := 1601
	MY_ID_STR := fmt.Sprintf("%04d", MY_ID)

	client := initZeroMQ(MY_ID_STR)
	defer client.Close()

	if len(os.Args) < 2 {
		fmt.Println("How to run:\n\ttracking [camera ID]")
		return
	}

	// parse args
	deviceID := os.Args[1]

	// open webcam
	webcam, err := gocv.OpenVideoCapture(deviceID)
	if err != nil {
		fmt.Printf("Error opening video capture device: %v\n", deviceID)
		return
	}
	defer webcam.Close()

	// open display window
	window := gocv.NewWindow("Tracking")
	defer window.Close()

	// create simple blob detector with parameters
	params := gocv.NewSimpleBlobDetectorParams()
	params.SetMinThreshold(50)
	params.SetMaxThreshold(230)
	params.SetFilterByCircularity(true)
	params.SetMinCircularity(0.5)
	params.SetFilterByArea(true)
	params.SetMinArea(9)
	params.SetFilterByInertia(false)
	bdp := gocv.NewSimpleBlobDetectorWithParams(params)
	defer bdp.Close()

	// prepare image matrix
	img := gocv.NewMat()
	defer img.Close()

	simpleKP := gocv.NewMat()
	defer simpleKP.Close()

	// set webcam properties
	webcam.Set(gocv.VideoCaptureFrameWidth, 1920)
	webcam.Set(gocv.VideoCaptureFrameHeight, 1080)

	// read an initial image
	if ok := webcam.Read(&img); !ok {
		fmt.Printf("cannot read device %v\n", deviceID)
		return
	}

	lag_sub_id, lag_sub_id_err := newUUID()
	checkErr(lag_sub_id_err)
	lag_sub_query := map[string]interface{}{"id": lag_sub_id, "facts": []string{"$ $ measured latency $lag ms at $"}}
	lag_sub_query_msg, _ := json.Marshal(lag_sub_query)
	lag_sub_msg := fmt.Sprintf("SUBSCRIBE%s%s", MY_ID_STR, lag_sub_query_msg)
	client.SendMessage(lag_sub_msg)

	lag := 250
	papers_cache := make(map[string]PaperCache)

	for {
		start := time.Now()

		hasNewLag, newLag := getLag(client, MY_ID_STR, lag_sub_id)
		if (hasNewLag) {
			log.Println("**UPDATED LAG", newLag)
			lag = newLag
		}

		log.Println("waiting for dots")
		points, dotKeyPoints, dotError := getDots(window, deviceID, webcam, bdp, img)
		log.Println("got dots")
		checkErr(dotError)

		timeGotDots := time.Since(start)
		// printDots(points)
		step1 := doStep1(points)
		log.Println("step1", len(step1))
		// printDots(step1)

		step2 := doStep2(step1)
		log.Println("step2", len(step2))
		// printCorners(step2[:5])
		// claimCorners(step2)
		step3 := doStep3(step1, step2)
		log.Println("step3", len(step3))
		// printCorners(step3)
		step4 := doStep4CornersWithIds(step1, step3, dotCodes8400)
		log.Println("step4", len(step4))
		// claimCorners(client, step4)
		// printCorners(step4)
		papers := getPapersFromCorners(step4)
		// log.Println(papers)
		log.Println("papers", len(papers))

		timeProcessing := time.Since(start)

		//// update papers_cache
		has_updated_papers_cache := false
		seen_papers_map := make(map[string]bool)
		// check if seen papers have a different location
		for _, seen_paper := range papers {
			seen_papers_map[seen_paper.Id] = true
			_, seen_paper_in_cache := papers_cache[seen_paper.Id]
			if seen_paper_in_cache {
				// check if corners moved
				// if total distance between corners is different enough -> update cache
				cached_paper := papers_cache[seen_paper.Id].Paper
				total_corner_distance_squared := float64(0)
				for i := 0; i < 4; i++ {
					total_corner_distance_squared += distanceSquared(
						Vec{seen_paper.Corners[i].X, seen_paper.Corners[i].Y},
						Vec{cached_paper.Corners[i].X, cached_paper.Corners[i].Y},
					)
				}
				if total_corner_distance_squared > float64(TOTAL_CORNER_DISTANCE_SQ_DIFF_THESHOLD) {
					// corners have moved -> update cache with current seen paper
					papers_cache[seen_paper.Id] = PaperCache{seen_paper, 0}
					has_updated_papers_cache = true
					log.Println("Updating paper because corners have moved", seen_paper.Id, total_corner_distance_squared)
				} else {
					// otherwise, we just reset the not seen count to zero
					papers_cache[seen_paper.Id] = PaperCache{papers_cache[seen_paper.Id].Paper, 0}
				}
			} else {
				// add new paper to cache
				has_updated_papers_cache = true
				papers_cache[seen_paper.Id] = PaperCache{seen_paper, 0}
			}
		}
		// increment counts of not seen papers and remove unseen
		for cached_paper_id, cached_paper := range papers_cache {
			if !seen_papers_map[cached_paper_id] {
				newNotSeenCount := cached_paper.NotSeenCount + 1
				if newNotSeenCount >= NOT_SEEN_PAPER_COUNT_THRESHOLD {
					has_updated_papers_cache = true
					delete(papers_cache, cached_paper_id)
				} else {
					papers_cache[cached_paper_id] = PaperCache{cached_paper.Paper, newNotSeenCount}
				}
			}
		}

		if has_updated_papers_cache {
			claimPapersAndCorners(client, MY_ID_STR, papers_cache, step4)
		} else {
			log.Println("No change in papers, skipping claim")
		}

		elapsed := time.Since(start)
		log.Printf("get dots  : %s \n", timeGotDots)
		log.Printf("processing: %s \n", timeProcessing)
		log.Printf("total     : %s \n", elapsed)

		// time.Sleep(10 * time.Millisecond)
		// draw the keypoints on the webcam image
		if len(dotKeyPoints) > 0 {
			gocv.DrawKeyPoints(img, dotKeyPoints, &simpleKP, color.RGBA{0, 0, 255, 0}, gocv.DrawDefault)
		}
		for _, paper := range papers {
			fmt.Printf("Showing paper! %v %v %v\n", paper.Corners[0].X, paper.Corners[0].Y, paper.Id);
			gocv.Line(&simpleKP, image.Pt(paper.Corners[0].X, paper.Corners[0].Y), image.Pt(paper.Corners[1].X, paper.Corners[1].Y), color.RGBA{0, 255, 0, 0}, 2)
			gocv.Line(&simpleKP, image.Pt(paper.Corners[1].X, paper.Corners[1].Y), image.Pt(paper.Corners[2].X, paper.Corners[2].Y), color.RGBA{0, 255, 0, 0}, 2)
			gocv.Line(&simpleKP, image.Pt(paper.Corners[2].X, paper.Corners[2].Y), image.Pt(paper.Corners[3].X, paper.Corners[3].Y), color.RGBA{0, 255, 0, 0}, 2)
			gocv.Line(&simpleKP, image.Pt(paper.Corners[3].X, paper.Corners[3].Y), image.Pt(paper.Corners[0].X, paper.Corners[0].Y), color.RGBA{0, 255, 0, 0}, 2)
			gocv.PutText(&simpleKP, fmt.Sprintf("%v", paper.Id), image.Pt(paper.Corners[0].X, paper.Corners[0].Y),
				gocv.FontHersheyPlain, 1.2, color.RGBA{255, 0, 0, 0}, 2)
		}
		for _, corner := range step4 {
			gocv.PutText(&simpleKP, fmt.Sprintf("%v", corner.PaperId), image.Pt(corner.Corner.X, corner.Corner.Y),
				gocv.FontHersheyPlain, 1.2, color.RGBA{0, 0, 255, 0}, 2)
		}
		// show the image in the window, and wait
		window.IMShow(simpleKP)
		// this also limits the FPS - 1000 / 250 = 4 fps
		keyId := window.WaitKey(lag)
		if keyId == 27 {
			return
		} else if keyId == 99 {
			// 99 == c key
			claimBase64Screenshot(client, MY_ID_STR, img)
		}
	}
}

// https://stackoverflow.com/questions/48798588/how-do-you-remove-the-first-character-of-a-string
func trimLeftChars(s string, n int) string {
	m := 0
	for i := range s {
		if m >= n {
			return s[i:]
		}
		m++
	}
	return s[:0]
}

func getLag(client *zmq.Socket, MY_ID_STR string, lag_sub_id string) (bool, int) {
	sub_prefix := fmt.Sprintf("%s%s", MY_ID_STR, lag_sub_id)
	rawReply, err := client.RecvMessage(zmq.DONTWAIT)
	if err == nil {
		reply := rawReply[0]
		val := trimLeftChars(reply, len(sub_prefix)+13)
		json_val := make([]map[string][]string, 0)
		json.Unmarshal([]byte(val), &json_val)
		if len(json_val) > 0 {
			json_result := json_val[0]
			rawLag, err := strconv.Atoi(json_result["lag"][1])
			checkErr(err)
			MIN_LOOP_DELAY := 200
			MAX_LOOP_DELAY := 5000
			lag := rawLag*5 + MIN_LOOP_DELAY
			if lag > MAX_LOOP_DELAY {
				lag = MAX_LOOP_DELAY
			}
			return true, lag
		}
	}
	return false, 0
}

func projectMissingCorner(orderedCorners []PaperCorner, missingCornerId int) PaperCorner {
	cornerA := orderedCorners[(missingCornerId+1)%4]
	cornerB := orderedCorners[(missingCornerId+2)%4]
	cornerC := orderedCorners[(missingCornerId+3)%4]
	return PaperCorner{
		CornerId: missingCornerId,
		X:        cornerA.X + cornerC.X - cornerB.X,
		Y:        cornerA.Y + cornerC.Y - cornerB.Y,
	}
}

func getPapersFromCorners(corners []Corner) []Paper {
	papersMap := make(map[string][]PaperCorner)
	for _, corner := range corners {
		cornerIdStr := strconv.Itoa(corner.PaperId)
		_, idInMap := papersMap[cornerIdStr]
		cornerDotVec := PaperCorner{corner.Corner.X, corner.Corner.Y, corner.CornerId}
		if idInMap {
			papersMap[cornerIdStr] = append(papersMap[cornerIdStr], cornerDotVec)
		} else {
			papersMap[cornerIdStr] = []PaperCorner{cornerDotVec}
		}
	}
	// log.Println(papersMap)
	papers := make([]Paper, 0)
	for id := range papersMap {
		if len(papersMap[id]) < 3 {
			continue
		}
		const TOP_LEFT = 0
		const TOP_RIGHT = 1
		const BOTTOM_RIGHT = 2
		const BOTTOM_LEFT = 3
		orderedCorners := make([]PaperCorner, 4) // [tl, tr, br, bl]
		for _, corner := range papersMap[id] {
			orderedCorners[corner.CornerId] = corner
		}
		if len(papersMap[id]) == 3 {
			// Identify the missing one then use the other three points to guess
			// where the missing corner would be.
			NIL_CORNER := PaperCorner{}
			for i := 0; i < 4; i++ {
				if orderedCorners[i] == NIL_CORNER {
					orderedCorners[i] = projectMissingCorner(orderedCorners, i)
				}
			}
			log.Println("FILLED IN A MISSING CORNER", id)
		}
		papers = append(papers, Paper{id, orderedCorners})
	}
	return papers
}

func printDots(data []Dot) {
	s := make([]string, len(data))
	for i, d := range data {
		s[i] = fmt.Sprintf("%#v", d)
	}
	log.Println(strings.Join(s, "\n"))
}

func printCorners(data []Corner) {
	s := make([]string, len(data))
	for i, d := range data {
		s[i] = fmt.Sprintf("%v \t %v \t %v \t %v \t %v", d.Corner, d.lines, d.sides, d.PaperId, d.CornerId)
	}
	log.Println(strings.Join(s, "\n"))

	cornersAlmostStr, err := json.Marshal(data)
	log.Println("Err?")
	log.Println(err)
	cornersStr := string(cornersAlmostStr)
	log.Println(cornersStr)
}

func distanceSquared(p1 Vec, p2 Vec) float64 {
	return math.Pow(float64(p1.X-p2.X), 2) +
		math.Pow(float64(p1.Y-p2.Y), 2)
}

func getWithin(points []Dot, ref Dot, i int, dist int) []int {
	within := make([]int, 0)
	for pi, point := range points {
		if pi != i && distanceSquared(Vec{point.X, point.Y}, Vec{ref.X, ref.Y}) < float64(math.Pow(float64(2*dist), 2)) {
			within = append(within, pi)
		}
	}
	return within
}

func doStep1(points []Dot) []Dot {
	// Connect Neighbors
	step1 := make([]Dot, len(points))
	for i, nodeData := range points {
		step1[i] = nodeData
		step1[i].Neighbors = getWithin(points, nodeData, i, dotSize)
	}
	return step1
}

func cosineSimilarity(vectA Vec, vectB Vec) float64 {
	var dotProduct float64 = float64(vectA.X*vectB.X + vectA.Y*vectB.Y)
	var normA float64 = float64(vectA.X*vectA.X + vectA.Y*vectA.Y)
	var normB float64 = float64(vectB.X*vectB.X + vectB.Y*vectB.Y)
	return dotProduct / (math.Sqrt(normA) * math.Sqrt(normB))
}

func sub(a Dot, b Dot) Vec {
	return Vec{a.X - b.X, a.Y - b.Y}
}

func crossProduct(a Vec, b Vec) float64 {
	return float64(a.X*b.Y - a.Y*b.X)
}

func getNeighborsInDirection(nodeData []Dot, node Dot, ref Dot) []int {
	direction := sub(node, ref)
	results := make([]int, 0)
	for _, neighbor := range node.Neighbors {
		neighborNode := nodeData[neighbor]
		if cosineSimilarity(sub(neighborNode, node), direction) > 0.95 {
			results = append(results, neighbor)
		}
	}
	return results
}

func searchInner(nodes []Dot, start Dot, depth int, results [][]int) [][]int {
	if depth == 0 {
		return results
	}
	newResults := make([][]int, 0)
	for _, path := range results {
		neighbors := getNeighborsInDirection(nodes, nodes[path[len(path)-1]], start)
		for _, neighbor := range neighbors {
			newResults = append(newResults, append(path, neighbor))
		}
	}
	return searchInner(nodes, start, depth-1, newResults)
}

func search(nodes []Dot, start Dot, depth int) [][]int {
	results := make([][]int, len(start.Neighbors))
	for i, neighbor := range start.Neighbors {
		results[i] = []int{neighbor}
	}
	return searchInner(nodes, start, depth-1, results)
}

func doStep2(points []Dot) []Corner {
	step2 := make([]Corner, len(points))
	for i, point := range points {
		step2[i] = Corner{Corner: point, lines: search(points, point, 3)}
	}
	return step2
}

func doStep3(nodes []Dot, corners []Corner) []Corner {
	results := make([]Corner, 0)
	for cornerIndex, corner := range corners {
		if len(corner.lines) < 2 {
			continue
		}
		for i := 0; i < len(corner.lines); i += 1 {
			for j := i + 1; j < len(corner.lines); j += 1 {
				side1 := corner.lines[i]
				side2 := corner.lines[j]
				line1 := sub(nodes[side1[len(side1)-1]], nodes[cornerIndex])
				line2 := sub(nodes[side2[len(side2)-1]], nodes[cornerIndex])
				similarity := cosineSimilarity(line1, line2)
				if math.Abs(similarity) < 0.5 {
					newCorner := corner
					if crossProduct(line1, line2) > 0 {
						newCorner.sides = [][]int{side2, side1}
						results = append(results)
					} else {
						newCorner.sides = [][]int{side1, side2}
					}
					results = append(results, newCorner)
				}
			}
		}
	}
	return results
}

func indexOf(word string, data []string) int {
	for k, v := range data {
		if word == v {
			return k
		}
	}
	return -1
}

func getColorDistance(a, b [3]int) float64 {
	// return math.Abs(float64(a[0]-b[0])) + math.Abs(float64(a[1]-b[1])) + math.Abs(float64(a[2]-b[2]))
	// using CIEDE2000 color diff is 5x slower than RGB diff (almost 2ms for one corner)
	c1 := &color.RGBA{
		uint8(a[0]),
		uint8(a[1]),
		uint8(a[2]),
		255,
	}
	c2 := &color.RGBA{
		uint8(b[0]),
		uint8(b[1]),
		uint8(b[2]),
		255,
	}
	return ciede2000.Diff(c1, c2)
}

func getGetPaperIdFromColors3(colors [][3]int, dotCodes8400 []string) (int, int, string) {
	idealColorsToDotIndex := []int{0, 0, 0, 0}
	idealColorsToDotIndexMinScore := []float64{99999.0, 99999.0, 99999.0, 99999.0}
	calibrationColors := make([][3]int, 4)
	calibrationColors[0] = [3]int{255, 0, 0}  // red
	calibrationColors[1] = [3]int{0, 255, 0}  // green
	calibrationColors[2] = [3]int{0, 0, 255}  // blue
	calibrationColors[3] = [3]int{0, 0, 0}    // dark
	matchedColors := []int{0, 0, 0, 0, 0, 0, 0}
	// find darkest color
	for i, colorData := range colors {
		dotScore := getColorDistance(colorData, calibrationColors[3])
		if dotScore < idealColorsToDotIndexMinScore[3] {
			idealColorsToDotIndexMinScore[3] = dotScore
			idealColorsToDotIndex[3] = i
		}
	}
	matchedColors[idealColorsToDotIndex[3]] = 3
	// find most red remaining color
	for i, colorData := range colors {
		dotScore := getColorDistance(colorData, calibrationColors[0])
		if i != idealColorsToDotIndex[3] && dotScore < idealColorsToDotIndexMinScore[0] {
			idealColorsToDotIndexMinScore[0] = dotScore
			idealColorsToDotIndex[0] = i
		}
	}
	matchedColors[idealColorsToDotIndex[0]] = 0
	// find most green remaining color
	for i, colorData := range colors {
		dotScore := getColorDistance(colorData, calibrationColors[1])
		if i != idealColorsToDotIndex[3] && i != idealColorsToDotIndex[0] && dotScore < idealColorsToDotIndexMinScore[1] {
			idealColorsToDotIndexMinScore[1] = dotScore
			idealColorsToDotIndex[1] = i
		}
	}
	matchedColors[idealColorsToDotIndex[1]] = 1
	// find most blue remaining color
	for i, colorData := range colors {
		dotScore := getColorDistance(colorData, calibrationColors[2])
		if i != idealColorsToDotIndex[3] && i != idealColorsToDotIndex[0] && i != idealColorsToDotIndex[1] && dotScore < idealColorsToDotIndexMinScore[2] {
			idealColorsToDotIndexMinScore[2] = dotScore
			idealColorsToDotIndex[2] = i
		}
	}
	matchedColors[idealColorsToDotIndex[2]] = 2
	// group remaining 3 colors to closest other color
	// for i, colorData := range colors {
	// 	if i != idealColorsToDotIndex[0] && i != idealColorsToDotIndex[1] && i != idealColorsToDotIndex[2] && i != idealColorsToDotIndex[3] {
	// 		min := 99999.0
	// 		min_k := 0
	// 		for k, matchedColorIndex := range idealColorsToDotIndex {
	// 			d := getColorDistance(colorData, colors[matchedColorIndex])
	// 			if d < min {
	// 				min = d
	// 				min_k = k
	// 			}
	// 		}
	// 		matchedColors[i] = min_k
	// 	}
	// }
	// Assign 3 remaining colors
	darkLuminance := 0.2126*float64(colors[idealColorsToDotIndex[3]][0]) + 0.7152*float64(colors[idealColorsToDotIndex[3]][1]) + 0.0722*float64(colors[idealColorsToDotIndex[3]][2])
	minNonDarkLuminance := 99999.0
	for i := 0; i < 3; i++ {
		nonDarkLuminance := 0.2126*float64(colors[idealColorsToDotIndex[i]][0]) + 0.7152*float64(colors[idealColorsToDotIndex[i]][1]) + 0.0722*float64(colors[idealColorsToDotIndex[i]][2])
		if nonDarkLuminance < minNonDarkLuminance {
			minNonDarkLuminance = nonDarkLuminance
		}
	}
	luminanceThreshold := (darkLuminance + minNonDarkLuminance)/2.0
	log.Printf("luminance -- dark: %f min color: %f difference: %f \n", darkLuminance, minNonDarkLuminance, minNonDarkLuminance-darkLuminance)

	for i, colorData := range colors {
		if i != idealColorsToDotIndex[0] && i != idealColorsToDotIndex[1] && i != idealColorsToDotIndex[2] && i != idealColorsToDotIndex[3] {
			luminance := 0.2126*float64(colorData[0]) + 0.7152*float64(colorData[1]) + 0.0722*float64(colorData[2])
			if luminance < luminanceThreshold {
				matchedColors[i] = 3
			} else {
				min := 99999.0
				min_k := 0
				for k, matchedColorIndex := range idealColorsToDotIndex {
					d := getColorDistance(colorData, colors[matchedColorIndex])
					if d < min {
						min = d
						min_k = k
					}
				}
				matchedColors[i] = min_k
			}
		}
	}
	// return results
	var colorString string
	for _, matchedColor := range matchedColors {
		colorString += strconv.Itoa(matchedColor)
	}
	log.Printf("%v \n", colorString)
	colors8400Index := indexOf(colorString, dotCodes8400)
	if colors8400Index > 0 {
		paperId := colors8400Index % (8400 / 4)
		cornerId := colors8400Index / (8400 / 4)
		return paperId, cornerId, colorString
	}
	return -1, -1, colorString
}

func lineToColors(nodes []Dot, line []int, shouldReverse bool) [][3]int {
	results := make([][3]int, len(line))
	for i, nodeIndex := range line {
		if shouldReverse {
			results[len(line)-1-i] = nodes[nodeIndex].Color
		} else {
			results[i] = nodes[nodeIndex].Color
		}
	}
	return results
}

func doStep4CornersWithIds(nodes []Dot, corners []Corner, dotCodes8400 []string) []Corner {
	results := make([]Corner, 0)
	for _, corner := range corners {
		newCorner := corner
		rawColorsList := append(append(lineToColors(nodes, corner.sides[0], true), corner.Corner.Color), lineToColors(nodes, corner.sides[1], false)...)
		paperId, cornerId, colorString := getGetPaperIdFromColors3(rawColorsList, dotCodes8400)
		newCorner.PaperId = paperId
		newCorner.CornerId = cornerId
		newCorner.ColorString = colorString
		newCorner.RawColorsList = rawColorsList
		results = append(results, newCorner)
	}
	return results
}

func makeTimestampMillis() int64 {
	return time.Now().UnixNano() / int64(time.Millisecond)
}

func GetVecbAt(m gocv.Mat, row int, col int) []uint8 {
	ch := m.Channels()
	v := make([]uint8, ch)

	for c := 0; c < ch; c++ {
		v[c] = m.GetUCharAt(row, col*ch+c)
	}

	return v
}

func getDots(window *gocv.Window, deviceID string, webcam *gocv.VideoCapture, bdp gocv.SimpleBlobDetector, img gocv.Mat) ([]Dot, []gocv.KeyPoint, error) {
	if ok := webcam.Read(&img); !ok {
		fmt.Printf("Device closed: %v\n", deviceID)
		return nil, nil, errors.New("DEVICE_CLOSED")
	}

	if img.Empty() {
		return make([]Dot, 0), make([]gocv.KeyPoint, 0), nil
	}

	// detect blobs/keypoints
	kp := bdp.Detect(img)
	fmt.Printf("Keypoints detected: %v\n", len(kp))

	res := make([]Dot, len(kp))

	// transform keypoints into []Dot
	N_H_SAMPLES := 1
	N_V_SAMPLES := 1
	TOTAL_SAMPLES := (2*N_H_SAMPLES+1) * (2*N_V_SAMPLES+1)
	for kpi, kpe := range kp {
		// sample pixels around the keypoint center to get the average color
		// this is to cut down the noise on the color
		colorSum := []int{0, 0, 0}
		for xi := -N_H_SAMPLES; xi <= N_H_SAMPLES; xi += 1 {
			for yi := -N_V_SAMPLES; yi <= N_V_SAMPLES; yi += 1 {
				colorThing := GetVecbAt(img, int(kpe.Y) + yi, int(kpe.X) + xi)
				colorSum[0] += int(colorThing[0])
				colorSum[1] += int(colorThing[1])
				colorSum[2] += int(colorThing[2])
			}
		}
		
		// OpenCV uses BGR color order so we use 2, 1, 0 to map it to RGB
		res[kpi] = Dot{
			int(kpe.X),
			int(kpe.Y),
			[3]int{
				int(colorSum[2]/TOTAL_SAMPLES),
				int(colorSum[1]/TOTAL_SAMPLES),
				int(colorSum[0]/TOTAL_SAMPLES),
			},
			make([]int, 0),
		}
	}

	return res, kp, nil
}

func claimPapersAndCorners(client *zmq.Socket, MY_ID_STR string, papers_cache map[string]PaperCache, corners []Corner) {
	papers := make([]Paper, 0)
	for _, cached_paper := range papers_cache {
		papers = append(papers, cached_paper.Paper)
	}
	log.Println("CLAIM PAPERS -----")
	log.Println(papers)
	// papersAlmostStr, _ := json.Marshal(papers)
	// papersStr := string(papersAlmostStr)
	// log.Println(papersStr)
	/*
		  type PaperCorner struct {
			X        int `json:"x"`
			Y        int `json:"y"`
			CornerId int
		}

		type Paper struct {
			Id      string        `json:"id"`
			Corners []PaperCorner `json:"corners"`
		}
	*/

	batch_claims := make([]BatchMessage, 0)
	batch_claims = append(batch_claims, BatchMessage{"retract", [][]string{
		[]string{"id", MY_ID_STR},
		[]string{"id", "0"},
		[]string{"postfix", ""},
	}})
	// $ camera $cameraId sees paper $id at TL ($x1, $y1) TR ($x2, $y2) BR ($x3, $y3) BL ($x4, $y4) @ $time
	for _, paper := range papers {
		batch_claims = append(batch_claims, BatchMessage{"claim", [][]string{
			[]string{"id", MY_ID_STR},
			[]string{"id", "0"},
			[]string{"text", "camera"},
			[]string{"integer", "1"},
			[]string{"text", "sees"},
			[]string{"text", "paper"},
			[]string{"integer", paper.Id},
			[]string{"text", "at"},
			[]string{"text", "TL"},
			[]string{"text", "("},
			[]string{"integer", strconv.Itoa(paper.Corners[0].X)},
			[]string{"text", ","},
			[]string{"integer", strconv.Itoa(paper.Corners[0].Y)},
			[]string{"text", ")"},
			[]string{"text", "TR"},
			[]string{"text", "("},
			[]string{"integer", strconv.Itoa(paper.Corners[1].X)},
			[]string{"text", ","},
			[]string{"integer", strconv.Itoa(paper.Corners[1].Y)},
			[]string{"text", ")"},
			[]string{"text", "BR"},
			[]string{"text", "("},
			[]string{"integer", strconv.Itoa(paper.Corners[2].X)},
			[]string{"text", ","},
			[]string{"integer", strconv.Itoa(paper.Corners[2].Y)},
			[]string{"text", ")"},
			[]string{"text", "BL"},
			[]string{"text", "("},
			[]string{"integer", strconv.Itoa(paper.Corners[3].X)},
			[]string{"text", ","},
			[]string{"integer", strconv.Itoa(paper.Corners[3].Y)},
			[]string{"text", ")"},
			[]string{"text", "@"},
			[]string{"integer", strconv.FormatUint(uint64(makeTimestampMillis()), 10)},
		}})
	}
	for _, corner := range corners {
		batch_claims = append(batch_claims, BatchMessage{"claim", [][]string{
			[]string{"id", MY_ID_STR},
			[]string{"id", "0"},
			[]string{"text", "camera"},
			[]string{"integer", "1"},
			[]string{"text", "sees"},
			[]string{"text", "corner"},
			[]string{"integer", strconv.Itoa(corner.CornerId)},
			[]string{"text", "of"},
			[]string{"text", "paper"},
			[]string{"integer", strconv.Itoa(corner.PaperId)},
			[]string{"text", "at"},
			[]string{"text", "("},
			[]string{"integer", strconv.Itoa(corner.Corner.X)},
			[]string{"text", ","},
			[]string{"integer", strconv.Itoa(corner.Corner.Y)},
			[]string{"text", ")"},
			[]string{"text", "@"},
			[]string{"integer", strconv.FormatUint(uint64(makeTimestampMillis()), 10)},
		}})
	}
	batch_claims = append(batch_claims, BatchMessage{"claim", [][]string{
		[]string{"id", MY_ID_STR},
		[]string{"id", "0"},
		[]string{"text", "dotsToPapers"},
		[]string{"text", "update"},
		[]string{"text", time.Now().String()},
	}})
	batch_claim_str, _ := json.Marshal(batch_claims)
	msg := fmt.Sprintf("....BATCH%s%s", MY_ID_STR, batch_claim_str)
	log.Println("Sending ", msg)
	s, err := client.SendMessage(msg)
	// s, err := client.SendMessage(msg, zmq.DONTWAIT)
	if err != nil {
		log.Println("ERROR!")
		log.Println(err)
		// panic(err)
	}
	log.Println("post send message!")
	log.Println(s)
}

func claimBase64Screenshot(client *zmq.Socket, MY_ID_STR string, img gocv.Mat) {
	// claim image as base64
	imgImg, err := img.ToImage()
	checkErr(err)
	scaled := resize.Resize(320, 0, imgImg, resize.Lanczos3) // 320px, 0 = keep aspect ratio
	var buf bytes.Buffer
	// err = Encode(&buf, img, &Options{Quality: tc.quality})
	encodeErr := png.Encode(&buf, scaled)
	checkErr(encodeErr)
	// encode to base64
	b64EncodedImage := base64.StdEncoding.EncodeToString(buf.Bytes())
	fmt.Println("Len image %v\n", len(b64EncodedImage))
	fmt.Println(b64EncodedImage)
	// end claim image as base64

	log.Println("CLAIM IMAGE -----")
	batch_claims := make([]BatchMessage, 0)
	batch_claims = append(batch_claims, BatchMessage{"retract", [][]string{
		[]string{"id", MY_ID_STR},
		[]string{"id", "1"},
		[]string{"postfix", ""},
	}})
	batch_claims = append(batch_claims, BatchMessage{"claim", [][]string{
		[]string{"id", MY_ID_STR},
		[]string{"id", "1"},
		[]string{"text", "camera"},
		[]string{"text", "1"},
		[]string{"text", "screenshot"},
		[]string{"text", b64EncodedImage},
	}})
	batch_claim_str, _ := json.Marshal(batch_claims)
	msg := fmt.Sprintf("....BATCH%s%s", MY_ID_STR, batch_claim_str)
	log.Println("Sending ", msg)
	s, err := client.SendMessage(msg)
	// s, err := client.SendMessage(msg, zmq.DONTWAIT)
	if err != nil {
		log.Println("ERROR!")
		log.Println(err)
		// panic(err)
	}
	log.Println("post send message! 2")
	log.Println(s)
}

func get8400(fileName string) []string {
	f, err := os.Open(fileName)
	if err != nil {
		panic(err)
	}
	// Create new Scanner.
	scanner := bufio.NewScanner(f)
	result := []string{}
	// Use Scan.
	for scanner.Scan() {
		line := scanner.Text()
		// Append line to result.
		result = append(result, line)
	}
	return result
}
