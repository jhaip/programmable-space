package main

import (
	"bufio"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/jung-kurt/gofpdf"
	zmq "github.com/pebbe/zmq4"
)

const MY_ID = 1382

type PrintWishResult struct {
	paperId       int
	shortFilename string
	sourceCode    string
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

func readLines(path string) ([]string, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var lines []string
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}
	return lines, scanner.Err()
}

func setFillColorFromDotCode(pdf *gofpdf.Fpdf, codeChar byte) {
	if codeChar == '0' {
		pdf.SetFillColor(255, 0, 0)
	} else if codeChar == '1' {
		pdf.SetFillColor(0, 255, 0)
	} else if codeChar == '2' {
		pdf.SetFillColor(0, 0, 255)
	} else {
		pdf.SetFillColor(0, 0, 0)
	}
}

func generatePrintFile(sourceCode string, programId int, name string, code8400 []string, pdf_output_folder string) {
	pdf := gofpdf.New("P", "mm", "Letter", "")
	pdf.AddPage()

	pdf.SetAutoPageBreak(false, 0)

	pageWidth, pageHeight := pdf.GetPageSize()
	leftMargin, topMargin, rightMargin, bottomMargin := pdf.GetMargins()
	circleRadius := 7.5
	circleMargin := 10 + circleRadius

	pdf.SetFont("Courier", "", 7)
	useOutline := false
	pdf.ClipRect(circleMargin+leftMargin, circleMargin+topMargin, pageWidth-circleMargin*2-leftMargin-rightMargin, pageHeight-topMargin*2-bottomMargin-circleMargin*2, useOutline)
	pdf.TransformBegin()
	pdf.TransformTranslate(circleMargin, circleMargin)
	prevX, prevY := pdf.GetXY()
	NlinesOnPaper := 74
	lineNumbers := make([]string, NlinesOnPaper)
	for i := 0; i < NlinesOnPaper; i++ {
		lineNumbers[i] = strconv.Itoa(i)
	}
	lineNumbersString := strings.Join(lineNumbers, "\n")
	lineNumbersWidth := 6.0
	pdf.SetTextColor(150, 150, 150)
	pdf.MultiCell(lineNumbersWidth, 3, lineNumbersString, "", "R", false)
	pdf.SetXY(prevX, prevY)
	pdf.TransformTranslate(lineNumbersWidth, 0)
	pdf.SetTextColor(0, 0, 0)
	pdf.MultiCell(pageWidth-circleMargin*2-leftMargin-rightMargin-lineNumbersWidth, 3, strings.Replace(sourceCode, string(9787), "\"", -1), "", "L", false)
	pdf.TransformEnd()
	pdf.ClipEnd()

	circleSpacing := circleRadius * 2.0 * 1.4
	for i := 0; i < 4; i++ {
		pdf.TransformBegin()
		pdf.SetFillColor(0, 0, 0)
		if i == 0 {
			pdf.TransformTranslate(circleMargin+0, circleMargin+0)
		} else if i == 3 {
			pdf.TransformTranslate(circleMargin, pageHeight-circleMargin)
		} else if i == 2 {
			pdf.TransformTranslate(pageWidth-circleMargin, pageHeight-circleMargin)
		} else {
			pdf.TransformTranslate(pageWidth-circleMargin, circleMargin)
		}
		pdf.TransformRotate(-90.0*float64(i), 0, 0)
		code := code8400[i*(8400/4)+programId]
		setFillColorFromDotCode(pdf, code[0])
		pdf.Circle(circleSpacing*0.0, circleSpacing*3.0, circleRadius, "F")
		setFillColorFromDotCode(pdf, code[1])
		pdf.Circle(circleSpacing*0.0, circleSpacing*2.0, circleRadius, "F")
		setFillColorFromDotCode(pdf, code[2])
		pdf.Circle(circleSpacing*0.0, circleSpacing*1.0, circleRadius, "F")
		setFillColorFromDotCode(pdf, code[3])
		pdf.Circle(circleSpacing*0.0, circleSpacing*0.0, circleRadius, "F")
		setFillColorFromDotCode(pdf, code[4])
		pdf.Circle(circleSpacing*1.0, circleSpacing*0.0, circleRadius, "F")
		setFillColorFromDotCode(pdf, code[5])
		pdf.Circle(circleSpacing*2.0, circleSpacing*0.0, circleRadius, "F")
		setFillColorFromDotCode(pdf, code[6])
		pdf.Circle(circleSpacing*3.0, circleSpacing*0.0, circleRadius, "F")
		pdf.TransformEnd()
	}

	pdf.SetFont("Courier", "B", 10)
	pdf.SetXY(0, pageHeight-topMargin*2-bottomMargin-circleRadius-2)
	pdf.WriteAligned(0, 20, strconv.Itoa(programId), "C")
	pdf.SetXY(0, pageHeight-topMargin*2-bottomMargin-circleRadius-2+6)
	pdf.SetFont("Courier", "", 8)
	pdf.WriteAligned(0, 20, name, "C")

	err := pdf.OutputFileAndClose(pdf_output_folder + strconv.Itoa(programId) + ".pdf")
	if err != nil {
		log.Println(err)
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

func get_wishes(client *zmq.Socket, MY_ID_STR string, subscription_id string) []PrintWishResult {
	rawReply, err := client.RecvMessage(0)
	reply := rawReply[0]
	if err != nil {
		log.Println("get wishes error:")
		log.Println(err)
		panic(err)
	} else {
		log.Println("reply:")
		log.Println(reply)
	}
	msg_prefix := fmt.Sprintf("%s%s", MY_ID_STR, subscription_id)
	val := trimLeftChars(reply, len(msg_prefix)+13)
	json_val := make([]map[string][]string, 0)
	jsonValErr := json.Unmarshal([]byte(val), &json_val)
	if jsonValErr != nil {
		panic(jsonValErr)
	}
	printWishResults := make([]PrintWishResult, len(json_val))
	for i, json_result := range json_val {
		paperId, paperIdParseErr := strconv.Atoi(json_result["id"][1])
		checkErr(paperIdParseErr)
		printWishResults[i] = PrintWishResult{paperId, json_result["shortFilename"][1], json_result["sourceCode"][1]}
	}
	return printWishResults
}

func cleanupWishes(client *zmq.Socket, MY_ID_STR string) {
	batch_claims := make([]BatchMessage, 0)
	batch_claims = append(batch_claims, BatchMessage{"retract", [][]string{
		[]string{"variable", ""},
		[]string{"variable", ""},
		[]string{"text", "wish"},
		[]string{"text", "paper"},
		[]string{"variable", ""},
		[]string{"text", "at"},
		[]string{"variable", ""},
		[]string{"text", "would"},
		[]string{"text", "be"},
		[]string{"text", "printed"},
	}})
	batch_claim_str, jsonMarshallErr := json.Marshal(batch_claims)
	checkErr(jsonMarshallErr)
	msg := fmt.Sprintf("....BATCH%s%s", MY_ID_STR, batch_claim_str)
	log.Println("Sending ", msg)
	s, err := client.SendMessage(msg)
	checkErr(err)
	log.Println("post send message!")
	log.Println(s)
}

func wishOutputFileWouldBePrinted(client *zmq.Socket, MY_ID_STR string, outputFilename string) {
	batch_claims := make([]BatchMessage, 0)
	batch_claims = append(batch_claims, BatchMessage{"claim", [][]string{
		[]string{"id", MY_ID_STR},
		[]string{"id", "1"},
		[]string{"text", "wish"},
		[]string{"text", "file"},
		[]string{"text", outputFilename},
		[]string{"text", "would"},
		[]string{"text", "be"},
		[]string{"text", "printed"},
	}})
	batch_claim_str, jsonMarshallErr := json.Marshal(batch_claims)
	checkErr(jsonMarshallErr)
	msg := fmt.Sprintf("....BATCH%s%s", MY_ID_STR, batch_claim_str)
	log.Println("Sending ", msg)
	s, err := client.SendMessage(msg)
	checkErr(err)
	log.Println("post send message!")
	log.Println(s)
}

func initZeroMQ(MY_ID_STR string) *zmq.Socket {
	log.Println("Connecting to server...")
	client, zmqCreationErr := zmq.NewSocket(zmq.DEALER)
	checkErr(zmqCreationErr)
	setIdentityErr := client.SetIdentity(MY_ID_STR)
	checkErr(setIdentityErr)
	connectErr := client.Connect("tcp://localhost:5570")
	checkErr(connectErr)

	init_ping_id := "aae54f21-d95f-48e7-a778-266a17274896"; // just a random ID
	client.SendMessage(fmt.Sprintf(".....PING%s%s", MY_ID_STR, init_ping_id))
	// block until ping response received
	_, recvErr := client.RecvMessage(0) 
	checkErr(recvErr);
	
	return client
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

func initWishSubscription(client *zmq.Socket, MY_ID_STR string) string {
	subscription_id, sub_id_err := newUUID()
	checkErr(sub_id_err)
	sub_query := map[string]interface{}{
		"id": subscription_id,
		"facts": []string{
			"$ $ wish paper $id at $shortFilename would be printed",
			"$ $ $shortFilename has source code $sourceCode",
		},
	}
	sub_query_msg, jsonMarshallErr := json.Marshal(sub_query)
	checkErr(jsonMarshallErr)
	sub_msg := fmt.Sprintf("SUBSCRIBE%s%s", MY_ID_STR, sub_query_msg)
	_, sendErr := client.SendMessage(sub_msg)
	checkErr(sendErr)
	return subscription_id
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

func main() {
	BASE_PATH := GetBasePath()

	/*** Set up logging ***/
	LOG_PATH := BASE_PATH + "logs/1382__print-paper.log"
	f, err := os.OpenFile(LOG_PATH, os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
	if err != nil {
		log.Fatalf("error opening file: %v", err)
	}
	defer f.Close()

	log.SetOutput(f)
	// log.Println("This is a test log entry")
	/*** /end logging setup ***/

	PDF_OUTPUT_FOLDER := BASE_PATH + "files/"
	DOT_CODES_PATH := BASE_PATH + "files/dot-codes.txt"
	code8400, err := readLines(DOT_CODES_PATH)
	checkErr(err)

	MY_ID_STR := fmt.Sprintf("%04d", MY_ID)

	client := initZeroMQ(MY_ID_STR)
	defer client.Close()
	subscription_id := initWishSubscription(client, MY_ID_STR)

	log.Println("done with init")

	for {
		printWishResults := get_wishes(client, MY_ID_STR, subscription_id)
		cleanupWishes(client, MY_ID_STR)
		for _, result := range printWishResults {
			log.Printf("%#v\n", result)
			log.Println("PROGRAM ID:::")
			log.Printf("%#v\n", result.paperId)
			log.Printf("%#v\n", result.shortFilename)
			generatePrintFile(result.sourceCode, result.paperId, result.shortFilename, code8400, PDF_OUTPUT_FOLDER)
			outputFilename := PDF_OUTPUT_FOLDER + strconv.Itoa(result.paperId) + ".pdf"
			wishOutputFileWouldBePrinted(client, MY_ID_STR, outputFilename)
		}
		time.Sleep(100 * time.Millisecond)
	}
}
