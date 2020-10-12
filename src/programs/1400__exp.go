package main

import (
	"fmt"
	"math/rand"
	"os"
	"strconv"
	"time"
	zmq "github.com/pebbe/zmq4"
)

func RandomString(len int) string {
      bytes := make([]byte, len)
     for i := 0; i < len; i++ {
          bytes[i] = byte(65 + rand.Intn(25))  //A=65 and Z = 65+25
      }
      return string(bytes)
}

func main() {
	N := 99
	MY_ID := os.Args[1]
	F, _ := strconv.Atoi(MY_ID)
	MY_ID_STR := fmt.Sprintf("%04d", F)
	if F == 1400 {
		F = F + N
	} else {
		F = F - 1
	}
	SUBSCRIPTION_ID_LEN := 36
	// fmt.Println(MY_ID)
	// fmt.Println(F)
	// fmt.Println(MY_ID_STR)

	// publisher, _ := zmq.NewSocket(zmq.PUB)
	// defer publisher.Close()
	// publisher.Connect("tcp://localhost:5556")
	// subscriber, _ := zmq.NewSocket(zmq.SUB)
	// defer subscriber.Close()
	// subscriber.SetSubscribe(MY_ID_STR)
	// // subscriber.SetRcvhwm(100000)
	// subscriber.Connect("tcp://localhost:5555")
	client, _ := zmq.NewSocket(zmq.DEALER)
	defer client.Close()

	client.SetIdentity(MY_ID_STR)
	client.Connect("tcp://localhost:5570")

	init_ping_id := RandomString(SUBSCRIPTION_ID_LEN)
	source_len := 4
	server_send_time_len := 13

	// time.Sleep(time.Duration(1000) * time.Millisecond)

	// publisher.Send(fmt.Sprintf(".....PING%s%s", MY_ID_STR, init_ping_id), zmq.DONTWAIT)
	client.SendMessage(fmt.Sprintf(".....PING%s%s", MY_ID_STR, init_ping_id))
	// fmt.Println("sent ping")
	fmt.Println(fmt.Sprintf("sent ping %s", MY_ID_STR))

	for {
		// msg, _ := subscriber.Recv(0)
		rawMsg, _ := client.RecvMessage(0)
		msg := rawMsg[0]
		// fmt.Println("Recv")
		// fmt.Println(msg)
		id := msg[source_len:(source_len + SUBSCRIPTION_ID_LEN)]
		// fmt.Println("ID:")
		// fmt.Println(id)
		val := msg[(source_len + SUBSCRIPTION_ID_LEN + server_send_time_len):]
		if id == init_ping_id {
			fmt.Println(fmt.Sprintf("server is listening %s", MY_ID_STR))
			break
		} else {
			fmt.Println(val)
		}
	}

	subscription_id := RandomString(SUBSCRIPTION_ID_LEN)
	// sub_msg := fmt.Sprintf("{\"id\": \"%s\", \"facts\": [\"$ test client %s says $x @ $time1\", \"$ test client %d says $y @ $time2\"]}", subscription_id, MY_ID, F)
	sub_msg := fmt.Sprintf("{\"id\": \"%s\", \"facts\": [\"$ test client %d says $y @ $time2 $garbage\"]}", subscription_id, F)
	// publisher.Send(fmt.Sprintf("SUBSCRIBE%s%s", MY_ID_STR, sub_msg), zmq.DONTWAIT)
	client.SendMessage(fmt.Sprintf("SUBSCRIBE%s%s", MY_ID_STR, sub_msg))

	var startTimeMs int64
	var startTimeMicro int64
	garbage := "J"
	// garbage := "data:image/jpeg;base64,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"
	
	if MY_ID == "1400" {
		// time.Sleep(time.Duration(10) * time.Second)
		startTimeMs = time.Now().UnixNano() / 1000000
		startTimeMicro = time.Now().UnixNano() / 1000
		currentTimeMs := time.Now().UnixNano() / 1000000
		claim_msg := fmt.Sprintf("[{\"type\": \"claim\", \"fact\": [[\"text\", \"%s\"], [\"text\", \"test\"], [\"text\", \"client\"], [\"integer\", \"%s\"], [\"text\", \"says\"], [\"integer\", \"%s\"], [\"text\", \"@\"], [\"integer\", \"%d\"], [\"text\", \"%s\"]]}]", MY_ID_STR, MY_ID, MY_ID, currentTimeMs, garbage)
		// publisher.Send(fmt.Sprintf("....BATCH%s%s", MY_ID_STR, claim_msg), zmq.DONTWAIT)
		client.SendMessage(fmt.Sprintf("....BATCH%s%s", MY_ID_STR, claim_msg))
		fmt.Println("startup claim done")
	}
	
	fmt.Println(fmt.Sprintf("listening... %s", MY_ID_STR))
	for {
		// subscriber.Recv(0)
		client.RecvMessage(0)
		// msg, _ := client.RecvMessage(0)
		// fmt.Println(msg);
		// _, err := subscriber.Recv(0)
		// if err != nil {
		// 	fmt.Println(fmt.Sprintf("RECV ERROR! %s", MY_ID_STR))
		// }
		// fmt.Println(fmt.Sprintf("Recv %s", MY_ID_STR))
		// fmt.Println(msg)
		// id := msg[source_len:(source_len + SUBSCRIPTION_ID_LEN)]
		// val := msg[(source_len + SUBSCRIPTION_ID_LEN + server_send_time_len):]
		// fmt.Println(id)
		// fmt.Println(val)

		currentTimeMs := time.Now().UnixNano() / 1000000
		if MY_ID == "1400" {
			// finish_time := msg[22:35]  // hack to extract time instead of parsing JSON
			fmt.Println("test is done!")
			fmt.Println(fmt.Sprintf("elapsed time: %d ms", currentTimeMs-startTimeMs))
			fmt.Println(fmt.Sprintf("elapsed time: %d us", (time.Now().UnixNano() / 1000)-startTimeMicro))
		} else {
			claim_msg := fmt.Sprintf("[{\"type\": \"claim\", \"fact\": [[\"text\", \"%s\"], [\"text\", \"test\"], [\"text\", \"client\"], [\"integer\", \"%s\"], [\"text\", \"says\"], [\"integer\", \"%s\"], [\"text\", \"@\"], [\"integer\", \"%d\"], [\"text\", \"%s\"]]}]", MY_ID_STR, MY_ID, MY_ID, currentTimeMs, garbage)
			// publisher.Send(fmt.Sprintf("....BATCH%s%s", MY_ID_STR, claim_msg), zmq.DONTWAIT)
			client.SendMessage(fmt.Sprintf("....BATCH%s%s", MY_ID_STR, claim_msg))
			// fmt.Println(fmt.Sprintf("response claim from %s", MY_ID_STR))
		}
		break
	}
	time.Sleep(time.Duration(1) * time.Second)
	// fmt.Println(fmt.Sprintf("exiting %s", MY_ID))
}