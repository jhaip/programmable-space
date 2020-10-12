package main

import (
	"encoding/json"
	"sync"
	"testing"
	"time"
	"reflect"
	"github.com/alecthomas/repr"
)

const CHANNEL_MESSAGE_DELIVERY_TEST_WAIT = time.Duration(1000) * time.Millisecond

func makeFactDatabase() map[string]Fact {
	db := make(map[string]Fact)
	claim(&db, Fact{[]Term{Term{"text", "Sensor"}, Term{"text", "is"}, Term{"integer", "5"}}})
	claim(&db, Fact{[]Term{Term{"text", "Sensor"}, Term{"text", "is"}, Term{"text", "low"}}})
	claim(&db, Fact{[]Term{Term{"text", "low"}, Term{"text", "has"}, Term{"integer", "0"}}})
	return db
}

func parseNotificationResult(notification Notification, t *testing.T) []map[string][]string {
	encoded_results := make([]map[string][]string, 0)
	err := json.Unmarshal([]byte(notification.Result), &encoded_results)
	if err != nil {
		t.Error("Error parsing notification result", notification)
	}
	return encoded_results
}

func TestMakeSubscriberV3(t *testing.T) {
	source := "1234"
	subscriptionId := "21dcca0a-ed5e-4593-b92e-fc9f16499cc8"
	query_part1 := []Term{
		Term{"variable", "A"},
		Term{"text", "is"},
		Term{"variable", "B"},
	}
	query_part2 := []Term{
		Term{"variable", "B"},
		Term{"text", "has"},
		Term{"variable", "C"},
	}
	query := [][]Term{query_part1, query_part2}
	subscription := Subscription{source, subscriptionId, query, make(chan []BatchMessage, 1000), &sync.WaitGroup{}, &sync.WaitGroup{}}
	subscription.dead.Add(1)
	subscription.warmed.Add(1)
	notifications := make(chan Notification, 1000)
	go startSubscriberV3(subscription, notifications, makeFactDatabase())

	time.Sleep(CHANNEL_MESSAGE_DELIVERY_TEST_WAIT)

	messages := make([]BatchMessage, 1)
	messages[0] = BatchMessage{"claim", [][]string{[]string{"text", "Sky"}, []string{"text", "is"}, []string{"text", "low"}}}
	subscription.batch_messages <- messages

	time.Sleep(CHANNEL_MESSAGE_DELIVERY_TEST_WAIT)

	if len(notifications) != 2 {
		t.Error("Wrong count of notifications", len(notifications))
		return
	}

	notification := <-notifications

	encoded_results := parseNotificationResult(notification, t)
	expectedResult := make([]map[string][]string, 1)
	expectedResult[0] = make(map[string][]string)
	expectedResult[0]["A"] = []string{"text", "Sensor"}
	expectedResult[0]["B"] = []string{"text", "low"}
	expectedResult[0]["C"] = []string{"integer", "0"}
	if !reflect.DeepEqual(expectedResult, encoded_results) {
		t.Error("Wrong notification result", expectedResult, encoded_results)
		return
	}
	// repr.Println(notification, repr.Indent("  "), repr.OmitEmpty(true))
	// repr.Println(encoded_results, repr.Indent("  "), repr.OmitEmpty(true))

	notification2 := <-notifications
	encoded_results2 := parseNotificationResult(notification2, t)
	expectedResult2 := make([]map[string][]string, 2)
	expectedResult2[0] = make(map[string][]string)
	expectedResult2[0]["A"] = []string{"text", "Sensor"}
	expectedResult2[0]["B"] = []string{"text", "low"}
	expectedResult2[0]["C"] = []string{"integer", "0"}
	expectedResult2[1] = make(map[string][]string)
	expectedResult2[1]["A"] = []string{"text", "Sky"}
	expectedResult2[1]["B"] = []string{"text", "low"}
	expectedResult2[1]["C"] = []string{"integer", "0"}
	if !reflect.DeepEqual(expectedResult2, encoded_results2) {
		t.Error("Wrong notification result", expectedResult2, encoded_results2)
		return
	}
	// repr.Println(notification2, repr.Indent("  "), repr.OmitEmpty(true))

	// Test that a repeated claim does not change the result:
	subscription.batch_messages <- messages

	time.Sleep(CHANNEL_MESSAGE_DELIVERY_TEST_WAIT)

	if len(notifications) != 0 {
		repr.Println("Wrong count of notifications")
		notification3 := <-notifications
		encoded_results3 := parseNotificationResult(notification3, t)
		repr.Println(expectedResult2, repr.Indent("  "), repr.OmitEmpty(true))
		repr.Println(encoded_results3, repr.Indent("  "), repr.OmitEmpty(true))
		if !reflect.DeepEqual(expectedResult2, encoded_results3) {
			t.Error("Wrong notification result", expectedResult2, encoded_results3)
		} else {
			repr.Println("Notification is correct but should not have happened")
		}
		repr.Println("Wrong count of notifications")
		t.Error("Wrong count of notifications", len(notifications))
		return
	}
}

// where the $ allows unique facts but the result is still just (A, B)
/* Test where a new fact is added to the database, but the resulting notification is the same
 * Results should be cached and should not send a notification.
 */
func TestSubscriberV3NewClaimSameResult(t *testing.T) {
	db := make(map[string]Fact)
	claim(&db, Fact{[]Term{Term{"text", "Sensor"}, Term{"text", "is"}, Term{"text", "low"}}})

	source := "1234"
	subscriptionId := "21dcca0a-ed5e-4593-b92e-fc9f16499cc8"
	query_part1 := []Term{
		Term{"variable", "A"},
		Term{"variable", ""},
		Term{"variable", "B"},
	}
	query := [][]Term{query_part1}
	subscription := Subscription{source, subscriptionId, query, make(chan []BatchMessage, 1000), &sync.WaitGroup{}, &sync.WaitGroup{}}
	subscription.dead.Add(1)
	subscription.warmed.Add(1)
	notifications := make(chan Notification, 1000)
	go startSubscriberV3(subscription, notifications, db)

	time.Sleep(CHANNEL_MESSAGE_DELIVERY_TEST_WAIT)

	if len(notifications) != 1 {
		t.Error("Wrong count of notifications", len(notifications))
		return
	}

	// Make a claim a unique claim that matches the subscription query, but does not product a unique result
	messages := make([]BatchMessage, 1)
	messages[0] = BatchMessage{"claim", [][]string{[]string{"text", "Sensor"}, []string{"text", "was"}, []string{"text", "low"}}}
	subscription.batch_messages <- messages

	time.Sleep(CHANNEL_MESSAGE_DELIVERY_TEST_WAIT)

	// If last result cache added to subscriber worker: change this to 1
	EXPECT_COUNT := 2
	if len(notifications) != EXPECT_COUNT {
		t.Error("Notification count is not correct", EXPECT_COUNT, len(notifications))
		return
	}

	// check the original notification result
	expectedResult := make(map[string][]string)
	expectedResult["A"] = []string{"text", "Sensor"}
	expectedResult["B"] = []string{"text", "low"}

	// All notifications should contain the same results
	for i := 0; i < EXPECT_COUNT; i++ {
		notification := <-notifications
		encoded_results := parseNotificationResult(notification, t)
		for _, encoded_result := range encoded_results {
			if !reflect.DeepEqual(expectedResult, encoded_result) {
				t.Error("Wrong notification result", expectedResult, encoded_result, i)
				return
			}
		}
		
	}
}
