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

// go test go-cv_test.go 1601__frame-to-papers.go

func TestImage1(t *testing.T) {
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

	window := gocv.NewWindow("Tracking")
	defer window.Close()

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
		gocv.PutText(&simpleKP, fmt.Sprintf("%v", paper.Id), image.Pt(paper.Corners[0].X, paper.Corners[0].Y),
			gocv.FontHersheyPlain, 1.2, color.RGBA{255, 0, 0, 0}, 2)
	}
	for _, corner := range step4 {
		gocv.PutText(&simpleKP, fmt.Sprintf("%v", corner.PaperId), image.Pt(corner.Corner.X, corner.Corner.Y),
			gocv.FontHersheyPlain, 1.2, color.RGBA{0, 0, 255, 0}, 2)
	}
	window.IMShow(simpleKP)
	window.WaitKey(0)

	// simpleKp
}