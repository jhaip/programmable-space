package main

import (
	"fmt"
	"image"
	"image/color"
	"os"
	"log"
	"testing"
	"gocv.io/x/gocv"
)

// go test go-cv_test.go 1601__frame-to-papers.go -count=1
// SHOW_DEBUG_WINDOW=1 go test go-cv_test.go 1601__frame-to-papers.go -count=1

func TestImage1(t *testing.T) {
	showDebugWindowOs := os.Getenv("SHOW_DEBUG_WINDOW")
	showDebugWindow := false
	if showDebugWindowOs != "" {
		showDebugWindow = true
	}

	BASE_PATH := GetBasePath()
	dotCodes8400 := get8400(BASE_PATH + "files/dot-codes.txt")
	if len(dotCodes8400) != 8400 {
		panic("DID NOT GET 8400 DOT CODES")
	}

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

	// load img
	imgPath := BASE_PATH + "files/test-paper-dots/2.jpg"
	img := gocv.IMRead(imgPath, gocv.IMReadColor)
    if img.Empty() {
        fmt.Printf("Could not read image %s\n", imgPath)
        os.Exit(1)
	}

	points, dotKeyPoints, dotError := getDots(bdp, img)
	log.Println("got dots")
	checkErr(dotError)

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

	if len(papers) != 4 {
		t.Error("Wrong number of papers detected", len(papers), 4)
	}
	seenPaperMap := make(map[string]bool)
	for _, seen_paper := range papers {
		seenPaperMap[seen_paper.Id] = true
	}
	if _, ok := seenPaperMap["1986"]; !ok {
		t.Error("Paper not detected", "1986")
	}
	if _, ok := seenPaperMap["1013"]; !ok {
		t.Error("Paper not detected", "1013")
	}
	if _, ok := seenPaperMap["1567"]; !ok {
		t.Error("Paper not detected", "1567")
	}
	if _, ok := seenPaperMap["277"]; !ok {
		t.Error("Paper not detected", "277")
	}

	if !showDebugWindow {
		return
	}

	window := gocv.NewWindow("Tracking")
	defer window.Close()
	windowColors := gocv.NewWindow("Colors")
	defer windowColors.Close()
	colorsMat := gocv.NewMatWithSize(900, 500, gocv.MatTypeCV8UC3)
	defer colorsMat.Close()
	gocv.Rectangle(&colorsMat, image.Rect(0, 0, 500, 900), color.RGBA{255, 255, 255, 255}, -1)

	simpleKP := gocv.NewMat()
	defer simpleKP.Close()

	if len(dotKeyPoints) > 0 {
		log.Println(dotKeyPoints)
		gocv.DrawKeyPoints(img, dotKeyPoints, &simpleKP, color.RGBA{0, 0, 255, 0}, gocv.DrawDefault)
	}
	for _, paper := range papers {
		fmt.Printf("Showing paper! %v %v %v\n", paper.Corners[0].X, paper.Corners[0].Y, paper.Id);
		gocv.Line(&simpleKP, image.Pt(paper.Corners[0].X, paper.Corners[0].Y), image.Pt(paper.Corners[1].X, paper.Corners[1].Y), color.RGBA{0, 255, 0, 0}, 2)
		gocv.Line(&simpleKP, image.Pt(paper.Corners[1].X, paper.Corners[1].Y), image.Pt(paper.Corners[2].X, paper.Corners[2].Y), color.RGBA{0, 255, 0, 0}, 2)
		gocv.Line(&simpleKP, image.Pt(paper.Corners[2].X, paper.Corners[2].Y), image.Pt(paper.Corners[3].X, paper.Corners[3].Y), color.RGBA{0, 255, 0, 0}, 2)
		gocv.Line(&simpleKP, image.Pt(paper.Corners[3].X, paper.Corners[3].Y), image.Pt(paper.Corners[0].X, paper.Corners[0].Y), color.RGBA{0, 255, 0, 0}, 2)
		gocv.PutText(&simpleKP, fmt.Sprintf("%v", paper.Id), image.Pt(paper.Corners[0].X-10, paper.Corners[0].Y-10),
			gocv.FontHersheyPlain, 1.2, color.RGBA{255, 0, 0, 0}, 2)
	}
	// for _, corner := range step3 {
	// 	gocv.PutText(&simpleKP, fmt.Sprintf("corner"), image.Pt(corner.Corner.X, corner.Corner.Y),
	// 		gocv.FontHersheyPlain, 1.2, color.RGBA{0, 0, 0, 0}, 2)
	// }
	for ci, corner := range step4 {
		gocv.PutText(&simpleKP, fmt.Sprintf("%v", corner.PaperId), image.Pt(corner.Corner.X, corner.Corner.Y),
			gocv.FontHersheyPlain, 1.2, color.RGBA{0, 0, 255, 0}, 2)
		for i, colorCode := range corner.ColorString {
			dotColor := color.RGBA{0, 0, 0, 0}
			if colorCode == '0' {
				dotColor = color.RGBA{255, 0, 0, 0}
			} else if colorCode == '1' {
				dotColor = color.RGBA{0, 255, 0, 0}
			} else if colorCode == '2' {
				dotColor = color.RGBA{0, 0, 255, 0}
			}
			gocv.Circle(&simpleKP, image.Pt(corner.Corner.X + 20 * i, corner.Corner.Y+20), 5, dotColor, -1)	
		}
		gocv.Line(&simpleKP, image.Pt(corner.Corner.X, corner.Corner.Y), image.Pt(corner.Corner.X+dotSize, corner.Corner.Y), color.RGBA{255, 255, 0, 0}, 2)

		// Colors debug:
		gocv.PutText(&colorsMat, fmt.Sprintf("%v", corner.PaperId), image.Pt(0, 50 * ci + 20),
			gocv.FontHersheyPlain, 1.2, color.RGBA{0, 0, 255, 0}, 2)
		for i, colorCode := range corner.ColorString {
			dotColor := color.RGBA{0, 0, 0, 0}
			if colorCode == '0' {
				dotColor = color.RGBA{255, 0, 0, 0}
			} else if colorCode == '1' {
				dotColor = color.RGBA{0, 255, 0, 0}
			} else if colorCode == '2' {
				dotColor = color.RGBA{0, 0, 255, 0}
			}
			gocv.Circle(&colorsMat, image.Pt(70 + 20 * i, 50 * ci + 12), 10, dotColor, -1)
			rawColor := color.RGBA{
				uint8(corner.RawColorsList[i][0]),
				uint8(corner.RawColorsList[i][1]),
				uint8(corner.RawColorsList[i][2]),
				0,
			}
			gocv.Circle(&colorsMat, image.Pt(70 + 20 * i, 50 * ci + 12 + 20), 10, rawColor, -1)	
		}
		t.Logf("Corner: %v - %v", corner.PaperId, corner.CornerId)
		t.Logf("%v", corner.RawColorsList)
		t.Logf("%v", corner.ColorString)
	}
	window.IMShow(simpleKP)
	window.WaitKey(0)
	windowColors.IMShow(colorsMat)
	windowColors.WaitKey(0)
}

func checkCornerId(colors [][3]int, correctPaperId int, correctCornerId int, dotCodes8400 []string, t *testing.T) {
	paperId, cornerId, colorString := getGetPaperIdFromColors3(colors, dotCodes8400)
	if paperId != correctPaperId {
		t.Error("Wrong paper id", paperId, correctPaperId, cornerId, correctCornerId, colors, colorString)
	}
	if cornerId != correctCornerId {
		t.Error("Wrong corner id", paperId, correctPaperId, cornerId, correctCornerId, colors, colorString)
	}
}

func TestCornerColorDetection(t *testing.T) {
	BASE_PATH := GetBasePath()
	dotCodes8400 := get8400(BASE_PATH + "files/dot-codes.txt")
	if len(dotCodes8400) != 8400 {
		panic("DID NOT GET 8400 DOT CODES")
	}
	
	checkCornerId(
		[][3]int{{204, 31, 7}, {205, 27, 2}, {103, 95, 144}, {138, 136, 88}, {207, 27, 1}, {90, 53, 35}, {92, 55, 37}},
		1986, 0,
		dotCodes8400, t,
	)
	checkCornerId(
		[][3]int{{91, 58, 44}, {191, 40, 9}, {95, 95, 143}, {134, 135, 92}, {184, 50, 9}, {128, 139, 97}, {187, 53, 26}},
		1986, 1,
		dotCodes8400, t,
	)
	checkCornerId(
		[][3]int{{98, 115, 157}, {97, 114, 160}, {133, 150, 110}, {105, 118, 164}, {90, 76, 61}, {135, 148, 105}, {187, 69, 48}},
		1986, 2,
		dotCodes8400, t,
	)
	checkCornerId(
		[][3]int{{137, 149, 104}, {136, 147, 105}, {135, 146, 106}, {194, 51, 18}, {89, 67, 49}, {106, 108, 149}, {139, 142, 102}},
		1986, 3,
		dotCodes8400, t,
	)

	checkCornerId(
		[][3]int{{145, 130, 84}, {142, 127, 79}, {108, 83, 127}, {218, 5, 2}, {218, 4, 3}, {97, 48, 36}, {110, 89, 132}},
		1013, 0,
		dotCodes8400, t,
	)
	checkCornerId(
		[][3]int{{144, 129, 71}, {97, 47, 32}, {103, 91, 134}, {206, 20, 2}, {106, 90, 136}, {205, 23, 4}, {108, 92, 139}},
		1013, 1,
		dotCodes8400, t,
	)
	checkCornerId(
		[][3]int{{92, 57, 40}, {101, 100, 146}, {97, 98, 138}, {206, 40, 8}, {203, 34, 9}, {137, 138, 94}, {208, 28, 1}},
		1013, 2,
		dotCodes8400, t,
	)
	checkCornerId(
		[][3]int{{138, 134, 88}, {137, 135, 83}, {105, 93, 134}, {138, 131, 83}, {98, 53, 41}, {93, 51, 35}, {212, 20, 2}},
		1013, 3,
		dotCodes8400, t,
	)

	checkCornerId(
		[][3]int{{137, 119, 65}, {88, 38, 28}, {97, 80, 125}, {200, 8, 1}, {85, 40, 36}, {215, 6, 0}, {200, 11, 2}},
		1567, 0,
		dotCodes8400, t,
	)
	checkCornerId(
		[][3]int{{128, 123, 70}, {85, 45, 28}, {207, 13, 1}, {91, 47, 32}, {210, 16, 0}, {210, 18, 3}, {104, 88, 124}},
		1567, 1,
		dotCodes8400, t,
	)
	checkCornerId(
		[][3]int{{105, 87, 130}, {217, 5, 1}, {110, 81, 121}, {98, 43, 22}, {141, 122, 73}, {223, 3, 1}, {106, 81, 123}},
		1567, 2,
		dotCodes8400, t,
	)
	checkCornerId(
		[][3]int{{96, 42, 20}, {93, 39, 28}, {105, 78, 120}, {142, 118, 65}, {218, 1, 2}, {91, 38, 28}, {93, 37, 18}},
		1567, 3,
		dotCodes8400, t,
	)

	checkCornerId(
		[][3]int{{214, 27, 0}, {58, 22, 18}, {57, 25, 19}, {211, 20, 2}, {150, 129, 69}, {109, 87, 118}, {115, 84, 116}},
		277, 0,
		dotCodes8400, t,
	)
	checkCornerId(
		[][3]int{{216, 12, 0}, {114, 85, 123}, {149, 123, 72}, {54, 25, 18}, {149, 126, 68}, {217, 19, 3}, {147, 129, 69}},
		277, 1,
		dotCodes8400, t,
	)
	checkCornerId(
		[][3]int{{146, 126, 60}, {51, 20, 19}, {107, 87, 116}, {105, 84, 118}, {54, 20, 8}, {54, 26, 18}, {212, 28, 1}},
		277, 2,
		dotCodes8400, t,
	)
	checkCornerId(
		[][3]int{{105, 87, 121}, {48, 22, 21}, {100, 86, 121}, {101, 90, 124}, {46, 25, 15}, {205, 32, 1}, {145, 130, 75}},
		277, 3,
		dotCodes8400, t,
	)
}