package main

import (
	"bufio"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"image/color"
	"io"
	"log"
	"math"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/kokardy/listing"
	ciede2000 "github.com/mattn/go-ciede2000"
	zmq "github.com/pebbe/zmq4"
)

const CAM_WIDTH = 1920
const CAM_HEIGHT = 1080
const dotSize = 12

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
	checkErr(err);
	client.SendMessage(fmt.Sprintf(".....PING%s%s", MY_ID_STR, init_ping_id))
	// block until ping response received
	_, recvErr := client.RecvMessage(0) 
	checkErr(recvErr);
	
	return client
}

func main() {
	BASE_PATH := GetBasePath()

	/*** Set up logging ***/
	LOG_PATH := BASE_PATH + "logs/1800__dots-to-papers.log"
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

	MY_ID := 1800
	MY_ID_STR := fmt.Sprintf("%04d", MY_ID)

	client := initZeroMQ(MY_ID_STR)
	defer client.Close()
	count := 0

	dot_sub_id, dot_side_id_err := newUUID()
	checkErr(dot_side_id_err)
	dot_sub_query := map[string]interface{}{"id": dot_sub_id, "facts": []string{"$source $ dots $x $y color $r $g $b $t"}}
	dot_sub_query_msg, _ := json.Marshal(dot_sub_query)
	dot_sub_msg := fmt.Sprintf("SUBSCRIBE%s%s", MY_ID_STR, dot_sub_query_msg)
	client.SendMessage(dot_sub_msg)

	for {
		start := time.Now()

		log.Println("waiting for dots")
		points := getDots(client, MY_ID_STR, dot_sub_id, start) // getPoints()
		log.Println("got dots")

		timeGotDots := time.Since(start)
		// printDots(points)
		step1 := doStep1(points)
		log.Println("step1", len(step1))
		// printDots(step1)

		step2 := doStep2(step1)
		log.Println("step2", len(step2))
		// printCorners(step2[:5])
		// printJsonDots(step1)
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
		claimPapersAndCorners(client, MY_ID_STR, papers, step4)

		count += 1
		// claimCounter(client, count)

		elapsed := time.Since(start)
		log.Printf("get dots  : %s \n", timeGotDots)
		log.Printf("processing: %s \n", timeProcessing)
		log.Printf("total     : %s \n", elapsed)

		// time.Sleep(10 * time.Millisecond)
	}
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

func distanceSquared(p1 Dot, p2 Dot) float64 {
	return math.Pow(float64(p1.X-p2.X), 2) +
		math.Pow(float64(p1.Y-p2.Y), 2)
}

func getWithin(points []Dot, ref Dot, i int, dist int) []int {
	within := make([]int, 0)
	for pi, point := range points {
		if pi != i && distanceSquared(point, ref) < float64(math.Pow(float64(2*dist), 2)) {
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

func identifyColorGroups(colors [][3]int, group P) string {
	color_templates := listing.Permutations(
		listing.IntReplacer([]int{0, 1, 2, 3}), 4, false, 4,
	)
	// all order-dependent unique combinations of 0-3
	// log.Println(color_templates)

	calibration := [][3]int{[3]int{255, 0, 0}, [3]int{0, 255, 0}, [3]int{0, 0, 255}, [3]int{0, 0, 0}}
	// calibration := make([][3]int, 4)
	// calibration[0] = [3]int{183, 35, 77}   // red
	// calibration[1] = [3]int{114, 128, 106} // green
	// calibration[2] = [3]int{95, 116, 176}  // blue
	// calibration[3] = [3]int{22, 15, 39}    // dark

	minScore := -1.0
	var bestMatch []int // index = color, value = index of group in P that matches color
	for rr := range color_templates {
		r := rr.(listing.IntReplacer)
		score := 0.0
		score += getColorDistance(calibration[0], colors[group.G[r[0]][0]])
		score += getColorDistance(calibration[1], colors[group.G[r[1]][0]])
		score += getColorDistance(calibration[2], colors[group.G[r[2]][0]])
		score += getColorDistance(calibration[3], colors[group.G[r[3]][0]])
		// log.Println(r, score)
		if minScore == -1 || score < minScore {
			minScore = score
			bestMatch = r
		}
	}

	// log.Println("best match", bestMatch)

	result := make([]string, 7)
	for i, g := range bestMatch {
		for _, k := range group.G[g] {
			result[k] = strconv.Itoa(i)
		}
	}
	// log.Println("Result", result)  // Something like "1222203"

	return strings.Join(result, "")
}

func getGetPaperIdFromColors2(colors [][3]int, dotCodes8400 []string) (int, int, string) {
	// color_combinations := combinations_as_list(7, 4)
	color_combinations := listing.Combinations(
		listing.IntReplacer([]int{0, 1, 2, 3, 4, 5, 6}), 4, false, 7,
	)
	// all order-indepent unique combinations of 0-6 such as [0 1 2 3], [3 4 5 6]
	// log.Println(color_combinations)

	minScore := -1.0
	var bestGroup P
	for rr := range color_combinations {
		r := rr.(listing.IntReplacer)
		p := P{G: [][]int{[]int{r[0]}, []int{r[1]}, []int{r[2]}, []int{r[3]}}}
		// Fill p.U with unused #s
		for i := 0; i < 7; i += 1 {
			if r[0] != i && r[1] != i && r[2] != i && r[3] != i {
				p.U = append(p.U, i)
			}
		}
		// pop of each element in p.U and add to closet colored group
		for i := 0; i < 3; i += 1 {
			u_color := colors[p.U[0]]
			// add element to group closest in color
			min_i := 0
			min := getColorDistance(u_color, colors[r[0]])
			for j := 1; j < 4; j += 1 {
				d := getColorDistance(u_color, colors[r[j]])
				if d < min {
					min = d
					min_i = j
				}
			}
			p.G[min_i] = append(p.G[min_i], p.U[0])
			p.U = p.U[1:]
			p.score += min
		}

		// log.Println(p)

		// Keep track of the grouping with the lowest score
		if minScore == -1 || p.score < minScore {
			minScore = p.score
			bestGroup = p
		}
	}

	// log.Println("Best group", bestGroup)
	colorString := identifyColorGroups(colors, bestGroup)

	log.Printf("%v \n", colorString)
	colors8400Index := indexOf(colorString, dotCodes8400)
	if colors8400Index > 0 {
		paperId := colors8400Index % (8400 / 4)
		cornerId := colors8400Index / (8400 / 4)
		return paperId, cornerId, colorString
	}
	return -1, -1, colorString
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

// func getGetPaperIdFromColors(colors [][3]int, dotCodes8400 []string) (int, int, string) {
// 	var colorString string

// 	calibrationColors := make([][3]int, 4)
// 	calibrationColors[0] = [3]int{170, 48, 31}   // red
// 	calibrationColors[1] = [3]int{138, 131, 94}  // green
// 	calibrationColors[2] = [3]int{112, 118, 150} // blue
// 	calibrationColors[3] = [3]int{52, 23, 21}    // dark

// 	// calibrationColors[0] = [3]int{202, 61, 79}  // red
// 	// calibrationColors[1] = [3]int{162, 156, 118}  // green
// 	// calibrationColors[2] = [3]int{126, 148, 191}  // blue
// 	// calibrationColors[3] = [3]int{85, 58, 94}  // dark

// 	// calibrationColors[0] = [3]int{204, 98, 107}  // red
// 	// calibrationColors[1] = [3]int{200, 186, 167}  // green
// 	// calibrationColors[2] = [3]int{176, 170, 198}  // blue
// 	// calibrationColors[3] = [3]int{125, 91, 107}  // dark

// 	for _, colorData := range colors {
// 		minIndex := 0
// 		minValue := 99999.0
// 		for i, calibrationColorData := range calibrationColors {
// 			c1 := &color.RGBA{
// 				uint8(colorData[0]),
// 				uint8(colorData[1]),
// 				uint8(colorData[2]),
// 				255,
// 			}
// 			c2 := &color.RGBA{
// 				uint8(calibrationColorData[0]),
// 				uint8(calibrationColorData[1]),
// 				uint8(calibrationColorData[2]),
// 				255,
// 			}
// 			value := ciede2000.Diff(c1, c2)
// 			if i == 0 || value < minValue {
// 				minIndex = i
// 				minValue = value
// 			}
// 		}
// 		colorString += strconv.Itoa(minIndex)
// 	}
// 	log.Printf("%v \n", colorString)
// 	colors8400Index := indexOf(colorString, dotCodes8400)
// 	if colors8400Index > 0 {
// 		paperId := colors8400Index % (8400 / 4)
// 		cornerId := colors8400Index / (8400 / 4)
// 		return paperId, cornerId, colorString
// 	}
// 	return -1, -1, colorString
// }

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

func makeTimestampMillis() int64 {
	return time.Now().UnixNano() / int64(time.Millisecond)
}

func getDots(client *zmq.Socket, MY_ID_STR string, dot_sub_id string, start time.Time) []Dot {
	var reply string
	nLoops := 0
	dot_prefix := fmt.Sprintf("%s%s", MY_ID_STR, dot_sub_id)
	for reply == "" || reply[len(reply)-4:] == "[{}]" {
		log.Println("pre loop")
		for {
			nLoops += 1
			log.Println("pre loop inner")
			rawReply, err := client.RecvMessage(0)
			tmp_reply := rawReply[0]
			if err != nil {
				log.Println("get dots error:")
				log.Println(err)
				break
			} else {
				log.Println("tmp reply:")
				// log.Println(tmp_reply)
				reply = tmp_reply
				break
				// fmt.Println("GOT REPLY:")
				// fmt.Println(reply)
			}
			break
		}
		time.Sleep(1 * time.Millisecond)
		log.Println("end of loop")
	}
	timeGotDotsPre := time.Since(start)
	log.Printf("get dots pre  : %s , %s\n", timeGotDotsPre, nLoops)
	// log.Println("Received ", reply)
	timeVal, err := strconv.ParseInt(reply[len(dot_prefix):len(dot_prefix)+13], 10, 64)
	if err != nil {
		log.Println("ERROR PARSING in getDots")
		log.Println(err)
		panic(err)
	}
	timeDiff := makeTimestampMillis() - timeVal
	log.Printf("time diff: %v ms\n", timeDiff)
	val := trimLeftChars(reply, len(dot_prefix)+13)
	json_val := make([]map[string][]string, 0)
	/*
		  type Dot struct {
			X         int    `json:"x"`
			Y         int    `json:"y"`
			Color     [3]int `json:"color"`
			Neighbors []int  `json:"-"`
		}
	*/
	// TODO: parse val
	json.Unmarshal([]byte(val), &json_val)
	log.Println("GET JSON RESULT:")
	if len(json_val) > 0 {
		claimTime, _ := strconv.ParseFloat(json_val[0]["t"][1], 64)
		claimTimeDiff := makeTimestampMillis() - int64(claimTime)
		log.Printf("claim time diff: %v ms\n", claimTimeDiff)
	}
	res := make([]Dot, 0)
	for _, json_result := range json_val {
		x, _ := strconv.Atoi(json_result["x"][1])
		y, _ := strconv.Atoi(json_result["y"][1])
		r, _ := strconv.Atoi(json_result["r"][1])
		g, _ := strconv.Atoi(json_result["g"][1])
		b, _ := strconv.Atoi(json_result["b"][1])
		res = append(res, Dot{x, y, [3]int{r, g, b}, make([]int, 0)})
	}
	return res
}

func claimPapersAndCorners(client *zmq.Socket, MY_ID_STR string, papers []Paper, corners []Corner) {
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

	// for _, paper := range papers {
	// 	papersStr := fmt.Sprintf("camera 1 sees paper %s at TL %v %v TR %v %v BR %v %v BL %v %v at %v", paper.Id, paper.Corners[0].X, paper.Corners[0].Y, paper.Corners[1].X, paper.Corners[1].Y, paper.Corners[2].X, paper.Corners[2].Y, paper.Corners[3].X, paper.Corners[3].Y, 99)
	// 	msg := fmt.Sprintf("....CLAIM%s%s", MY_ID_STR, papersStr)
	// 	log.Println("Sending ", msg)
	// 	client.SendMessage(msg)
	// }

	batch_claims := make([]BatchMessage, 0)
	batch_claims = append(batch_claims, BatchMessage{"retract", [][]string{
		[]string{"id", MY_ID_STR},
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
			[]string{"id", "1"},
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
		[]string{"id", "2"},
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

func printJsonDots(dots []Dot) {
	cornersAlmostStr, err := json.Marshal(dots)
	log.Println("Err?")
	log.Println(err)
	cornersStr := string(cornersAlmostStr)
	log.Println(cornersStr)
	log.Println("---")
}

func claimCorners(client *zmq.Socket, corners []Corner) {
	cornersAlmostStr, err := json.Marshal(corners)
	log.Println("Err?")
	log.Println(err)
	cornersStr := string(cornersAlmostStr)
	log.Println(cornersStr)
	msg := fmt.Sprintf("CLAIM[global/corners]%s", cornersStr)
	log.Println("Sending ", msg)
	client.SendMessage(msg)
	// client.SendMessage(msg, zmq.DONTWAIT)
}

func claimCounter(client *zmq.Socket, count int) {
	msg := fmt.Sprintf("CLAIM[global/dtpcount]%v", count)
	log.Println("Sending ", msg)
	client.SendMessage(msg)
	// client.SendMessage(msg, zmq.DONTWAIT)
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
