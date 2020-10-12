package main

import (
	"encoding/json"
	"fmt"
	"os"
	"io/ioutil"
	"runtime"
	"sort"
	"strconv"
	"sync"
	"time"
	zmq "github.com/pebbe/zmq4"
	"go.uber.org/zap"
	b64 "encoding/base64"
)

var dbMutex sync.RWMutex
var subscriberMutex sync.RWMutex
var zmqClient sync.Mutex

type Term struct {
	Type  string
	Value string
}

type SelectQueryVariable struct {
	Fact     int
	Position int
	Equals   []SelectQueryVariable
}

type SubscriptionData struct {
	Id    string   `json:"id"`
	Facts []string `json:"facts"`
}

type Subscription struct {
	Source         string
	Id             string
	Query          [][]Term
	batch_messages chan []BatchMessage
	dead           *sync.WaitGroup
	warmed         *sync.WaitGroup
}

type Subscriptions struct {
	Subscriptions []Subscription
}

type Notification struct {
	Source string
	Id     string
	Result string
}

type BatchMessage struct {
	Type string     `json:"type"`
	Fact [][]string `json:"fact"`
}

func checkErr(err error) {
	if err != nil {
		zap.L().Fatal("FATAL ERROR", zap.Error(err))
		panic(err)
	}
}

func makeTimestampMillis() int64 {
	return time.Now().UnixNano() / int64(time.Millisecond)
}

func notification_worker(notifications <-chan Notification, client *zmq.Socket) {
	cache := make(map[string]string)
	for notification := range notifications {
		msg := fmt.Sprintf("%s%s%s", notification.Source, notification.Id, notification.Result)
		cache_key := fmt.Sprintf("%s%s", notification.Source, notification.Id)
		cache_value, cache_hit := cache[cache_key]
		if cache_hit == false || cache_value != msg {
			cache[cache_key] = msg
			msgWithTime := fmt.Sprintf("%s%s%v%s", notification.Source, notification.Id, makeTimestampMillis(), notification.Result)
			zmqClient.Lock()
			_, sendErr := client.SendMessage(notification.Source, msgWithTime)
			checkErr(sendErr)
			zmqClient.Unlock()
		}
	}
}

func marshal_query_result(query_results []QueryResult) string {
	encoded_results := make([]map[string][]string, 0)
	for _, query_result := range query_results {
		encoded_result := make(map[string][]string)
		for variable_name, term := range query_result.Result {
			encoded_result[variable_name] = []string{term.Type, term.Value}
		}
		encoded_results = append(encoded_results, encoded_result)
	}
	marshalled_results, err := json.Marshal(encoded_results)
	checkErr(err)
	return string(marshalled_results)
}

func subscribe_worker(subscription_messages <-chan string,
	subscriptions_notifications chan<- bool,
	subscriptions *Subscriptions,
	notifications chan<- Notification,
	db *map[string]Fact) {

	event_type_len := 9
	source_len := 4
	for msg := range subscription_messages {
		zap.L().Debug("SUBSCRIPTION SHOULD PARSE MESSAGE", zap.String("msg", msg))
		event_type := msg[0:event_type_len]
		source := msg[event_type_len:(event_type_len + source_len)]
		val := msg[(event_type_len + source_len):]
		if event_type == "SUBSCRIBE" {
			subscription_data := SubscriptionData{}
			err := json.Unmarshal([]byte(val), &subscription_data)
			checkErr(err)
			query := make([][]Term, 0)
			batch_messages := make([]BatchMessage, len(subscription_data.Facts))
			for i, fact_string := range subscription_data.Facts {
				fact := parse_fact_string(fact_string)
				query = append(query, fact)
				subscription_fact := append([]Term{Term{"text", "subscription"}, Term{"id", source}, Term{"text", subscription_data.Id}, Term{"integer", strconv.Itoa(i)}}, fact...)
				dbMutex.Lock()
				claim(db, Fact{subscription_fact})
				dbMutex.Unlock()
				// prepare a batch message for the new subscription fact
				batch_message_facts := make([][]string, len(subscription_fact))
				for k, subscription_fact_term := range subscription_fact {
					batch_message_facts[k] = []string{subscription_fact_term.Type, subscription_fact_term.Value}
				}
				batch_messages[i] = BatchMessage{"claim", batch_message_facts}
			}
			newSubscription := Subscription{source, subscription_data.Id, query, make(chan []BatchMessage, 1000), &sync.WaitGroup{}, &sync.WaitGroup{}}
			newSubscription.dead.Add(1)
			newSubscription.warmed.Add(1)
			subscriberMutex.Lock()
			(*subscriptions).Subscriptions = append(
				(*subscriptions).Subscriptions,
				newSubscription,
			)
			for _, subscription := range (*subscriptions).Subscriptions {
				subscription.batch_messages <- batch_messages
			}
			subscriberMutex.Unlock()
			// go startSubscriber(newSubscription, notifications, copyDatabase(db))
			go startSubscriberV3(newSubscription, notifications, copyDatabase(db))
			// subscriptions_notifications <- true // is this still needed?
		}
	}
}

func copyDatabase(db *map[string]Fact) map[string]Fact {
	dbCopy := make(map[string]Fact)
	dbMutex.RLock()
	for k, fact := range *db {
		dbCopy[k] = Fact{make([]Term, len(fact.Terms))}
		for i, term := range fact.Terms {
			dbCopy[k].Terms[i] = Term{term.Type, term.Value}
		}
	}
	dbMutex.RUnlock()
	return dbCopy
}

func debug_database_observer(db *map[string]Fact) {
	for {
		dbCopy := copyDatabase(db)
		dbAsSstring := []byte("\033[H\033[2J") // clear terminal output on MacOS
		dbAsBase64Strings := ""
		var keys []string
		for k, _ := range dbCopy {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, fact_string := range keys {
			dbAsSstring = append(dbAsSstring, []byte(fact_string)...)
			dbAsSstring = append(dbAsSstring, '\n')
			dbAsBase64Strings += "["
			for i, term := range dbCopy[fact_string].Terms {
				if i > 0 {
					dbAsBase64Strings += ","
				}
				if term.Type == "text" {
					dbAsBase64Strings += fmt.Sprintf("[\"%s\", \"%s\"]", term.Type, b64.StdEncoding.EncodeToString([]byte(term.Value)))
				} else {
					dbAsBase64Strings += fmt.Sprintf("[\"%s\", \"%v\"]", term.Type, term.Value)
				}
			}
			dbAsBase64Strings += "]\n"
		}
		dbAsBase64Strings += fmt.Sprintf("[[\"id\", \"0\"], [\"text\", \"%s\"]]\n", b64.StdEncoding.EncodeToString([]byte(time.Now().String())))
		err := ioutil.WriteFile("./db_view.txt", dbAsSstring, 0644)
		checkErr(err)
		err2 := ioutil.WriteFile("./db_view_base64.txt", []byte(dbAsBase64Strings), 0644)
		checkErr(err2)
		time.Sleep(1.0 * time.Second)
	}
}

func on_source_death(dying_source string, db *map[string]Fact, subscriptions *Subscriptions) {
	zap.L().Info("SOURCE DEATH - recv", zap.String("source", dying_source))
	// Retract all facts by source and facts about the source's subscriptions
	dbMutex.Lock()
	retract(db, Fact{[]Term{Term{"id", dying_source}, Term{"postfix", ""}}})
	retract(db, Fact{[]Term{Term{"text", "subscription"}, Term{"id", dying_source}, Term{"postfix", ""}}})
	dbMutex.Unlock()
	subscriberMutex.Lock()
	newSubscriptions := make([]Subscription, 0)
	for _, subscription := range (*subscriptions).Subscriptions {
		if subscription.Source != dying_source {
			newSubscriptions = append(newSubscriptions, subscription)
			batch_messages := []BatchMessage{
				BatchMessage{"retract", [][]string{[]string{"id", dying_source}, []string{"postfix", ""}}},
				BatchMessage{"retract", [][]string{[]string{"text", "subscription"}, []string{"id", dying_source}, []string{"postfix", ""}}},
			}
			subscription.batch_messages <- batch_messages
		} else {
			zap.L().Info("SOURCE DEATH - closing channel", zap.String("source", dying_source))
			waitStart := time.Now()
			// Wait for subscriber to stop sending cache warming messages
			// to itself to avoid error sending on a closed channel.
			subscription.warmed.Wait()
			close(subscription.batch_messages)
			zap.L().Info("SOURCE DEATH - waiting for death signal", zap.String("source", dying_source))
			subscription.dead.Wait()
			waitTimeElapsed := time.Since(waitStart)
			zap.L().Info("SOURCE DEATH - confirmed dead", zap.String("source", dying_source), zap.Duration("timeToClose", waitTimeElapsed))
			// SOMETHING BAD COULD HAPPEN IF A MESSAGE WAS RECEIVED AND SOMEONE TRIED TO
			// ADD A MESSAGE TO THE SUBSCRIPTIONS QUEUE
		}
	}
	(*subscriptions).Subscriptions = newSubscriptions
	subscriberMutex.Unlock()
}

func on_subscription_death(source string, subscriptionId string, db *map[string]Fact, subscriptions *Subscriptions) {
	zap.L().Info("SUBSCRIPTION DEATH - recv", zap.String("source", source), zap.String("subscriptionId", subscriptionId))
	dbMutex.Lock()
	retract(db, Fact{[]Term{Term{"text", "subscription"}, Term{"id", source}, Term{"text", subscriptionId}, Term{"postfix", ""}}})
	dbMutex.Unlock()
	subscriberMutex.Lock()
	newSubscriptions := make([]Subscription, 0)
	for _, subscription := range (*subscriptions).Subscriptions {
		if subscription.Id != subscriptionId {
			newSubscriptions = append(newSubscriptions, subscription)
			batch_messages := []BatchMessage{
				BatchMessage{"retract", [][]string{[]string{"text", "subscription"}, []string{"id", source}, []string{"text", subscriptionId}, []string{"postfix", ""}}},
			}
			subscription.batch_messages <- batch_messages
		} else {
			zap.L().Info("SUBSCRIPTION DEATH - closing channel", zap.String("source", source), zap.String("subscriptionId", subscriptionId))
			waitStart := time.Now()
			// Wait for subscriber to stop sending cache warming messages
			// to itself to avoid error sending on a closed channel.
			subscription.warmed.Wait()
			close(subscription.batch_messages)
			zap.L().Info("SUBSCRIPTION DEATH - waiting for death signal", zap.String("source", source), zap.String("subscriptionId", subscriptionId))
			subscription.dead.Wait()
			waitTimeElapsed := time.Since(waitStart)
			zap.L().Info("SUBSCRIPTION DEATH - confirmed dead", zap.String("source", source), zap.String("subscriptionId", subscriptionId), zap.Duration("timeToClose", waitTimeElapsed))
			// SOMETHING BAD COULD HAPPEN IF A MESSAGE WAS RECEIVED AND SOMEONE TRIED TO
			// ADD A MESSAGE TO THE SUBSCRIPTIONS QUEUE
		}
	}
	(*subscriptions).Subscriptions = newSubscriptions
	subscriberMutex.Unlock()
}

func batch_worker(batch_messages <-chan string, subscriptions_notifications chan<- bool, db *map[string]Fact, subscriptions *Subscriptions) {
	event_type_len := 9
	source_len := 4
	for msg := range batch_messages {
		// event_type := msg[0:event_type_len]
		// source := msg[event_type_len:(event_type_len + source_len)]
		val := msg[(event_type_len + source_len):]
		var batch_messages []BatchMessage
		err := json.Unmarshal([]byte(val), &batch_messages)
		if err != nil {
			zap.L().Info("BATCH MESSAGE BODY:")
			zap.L().Info(val)
		}
		checkErr(err)
		for _, batch_message := range batch_messages {
			terms := make([]Term, len(batch_message.Fact))
			for j, term := range batch_message.Fact {
				terms[j] = Term{term[0], term[1]}
			}
			if batch_message.Type == "claim" {
				dbMutex.Lock()
				claim(db, Fact{terms})
				dbMutex.Unlock()
			} else if batch_message.Type == "retract" {
				dbMutex.Lock()
				retract(db, Fact{terms})
				dbMutex.Unlock()
			} else if batch_message.Type == "death" {
				// Assume Fact = [["id", "0004"]]
				dying_source := batch_message.Fact[0][1]
				// This a blocking call that does a couple retracts and waits for a goroutine to die
				// There is a potential for slowdown or blocking the whole server if a subscriber won't die
				on_source_death(dying_source, db, subscriptions)
			} else if batch_message.Type == "subscriptiondeath" {
				// Assume Fact = [["id", "0004"], ["text", ..subscription id..]]
				source := batch_message.Fact[0][1]
				dying_subscription_id := batch_message.Fact[1][1]
				// This a blocking call that does a couple retracts and waits for a goroutine to die
				// There is a potential for slowdown or blocking the whole server if a subscriber won't die
				on_subscription_death(source, dying_subscription_id, db, subscriptions)
			}
		}
		// subscriptions_notifications <- true
		subscriberMutex.RLock()
		for _, subscription := range (*subscriptions).Subscriptions {
			subscription.batch_messages <- batch_messages
		}
		subscriberMutex.RUnlock()
	}
}

func GetBasePath() string {
	envBasePath := os.Getenv("DYNAMIC_ROOT")
	if envBasePath != "" {
		return envBasePath + "/"
	}
	env := "HOME"
	if runtime.GOOS == "windows" {
		env = "USERPROFILE"
	} else if runtime.GOOS == "plan9" {
		env = "home"
	}
	return os.Getenv(env) + "/lovelace/"
}

func NewLogger() (*zap.Logger, error) {
	// cfg := zap.NewProductionConfig()
	cfg := zap.NewDevelopmentConfig()
	cfg.OutputPaths = []string{
		GetBasePath() + "new-backend/go-server/server.log",
	}
	return cfg.Build()
}

func main() {
	logger, loggerCreateError := NewLogger() // zap.NewDevelopment()
	checkErr(loggerCreateError)
	zap.ReplaceGlobals(logger)

	factDatabase := make_fact_database()

	subscriptions := Subscriptions{}
	
	client, zmqCreationErr := zmq.NewSocket(zmq.ROUTER)
	checkErr(zmqCreationErr)
	defer client.Close()
	client.Bind("tcp://*:5570")
	zap.L().Info("Connecting to ZMQ")

	event_type_len := 9
	source_len := 4

	subscription_messages := make(chan string, 1000)
	subscriptions_notifications := make(chan bool, 1000)
	notifications := make(chan Notification, 1000)
	batch_messages := make(chan string, 1000)

	go subscribe_worker(subscription_messages, subscriptions_notifications, &subscriptions, notifications, &factDatabase)
	go notification_worker(notifications, client)
	go debug_database_observer(&factDatabase)
	go batch_worker(batch_messages, subscriptions_notifications, &factDatabase, &subscriptions)

	zap.L().Info("listening...")
	for {
		zmqClient.Lock()
		rawMsg, recvErr := client.RecvMessage(zmq.DONTWAIT)
		if recvErr != nil {
			zmqClient.Unlock()
			time.Sleep(time.Duration(1) * time.Millisecond)
			continue;
		}
		rawMsgId := rawMsg[0]
		msg := rawMsg[1]
		zmqClient.Unlock()
		event_type := msg[0:event_type_len]
		// source := msg[event_type_len:(event_type_len + source_len)]
		source := rawMsgId
		val := msg[(event_type_len + source_len):]
		if event_type == ".....PING" {
			zap.L().Debug("got PING", zap.String("source", source), zap.String("value", val))
			notifications <- Notification{source, val, ""}
		} else if event_type == "SUBSCRIBE" {
			subscription_messages <- msg
		} else if event_type == "....BATCH" {
			batch_messages <- msg
		}
		time.Sleep(time.Duration(1) * time.Microsecond)
	}
}
