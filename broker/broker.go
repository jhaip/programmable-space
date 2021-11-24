package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"runtime"
	// "sort"
	"strconv"
	"sync"
	"time"
	"go.uber.org/zap"
	"github.com/gorilla/websocket"
)

var dbMutex sync.RWMutex
var subscriberMutex sync.RWMutex
var upgrader = websocket.Upgrader{} // use default options

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
	UpdateSource string
}

type BatchMessage struct {
	Type string     `json:"type"`
	Fact [][]string `json:"fact"`
}

type Metric struct {
	Type string		`json:"type"`
	Source string	`json:"source"`
	Dest string  	`json:"dest"`
}

func checkErr(err error) {
	if err != nil {
		fmt.Println(err)
		zap.L().Fatal("FATAL ERROR", zap.Error(err))
		panic(err)
	}
}

func makeTimestampMillis() int64 {
	return time.Now().UnixNano() / int64(time.Millisecond)
}

func notifier(notifications <-chan Notification, wsConnection *websocket.Conn, metrics chan<- Metric) {
	cache := make(map[string]string)
	for notification := range notifications {
		msg := fmt.Sprintf("%s%s%s", notification.Source, notification.Id, notification.Result)
		cache_key := fmt.Sprintf("%s%s", notification.Source, notification.Id)
		cache_value, cache_hit := cache[cache_key]
		if cache_hit == false || cache_value != msg {
			cache[cache_key] = msg
			msgWithTime := fmt.Sprintf("%s%s%v%s", notification.Source, notification.Id, makeTimestampMillis(), notification.Result)
			sendErr := wsConnection.WriteMessage(websocket.TextMessage, []byte(msgWithTime))
			checkErr(sendErr)
			metrics <- Metric{"NOTIFICATION", notification.Source, notification.UpdateSource}
		}
	}
}

func make_new_metric_cache() map[string]map[string]int {
	cache := make(map[string]map[string]int)
	cache["PING"] = make(map[string]int)
	cache["SUBSCRIBE"] = make(map[string]int)
	cache["BATCH"] = make(map[string]int)
	cache["NOTIFICATION"] = make(map[string]int)
	return cache
}

func metrics_worker(metric_updates <-chan Metric) {
	cache := make_new_metric_cache()
	notificationMap := make(map[string]map[string]bool)
	lastLog := time.Now()
	for update := range metric_updates {
		if update.Type == "MAP" {
			_,  notificationMapHit := notificationMap[update.Source]
			if notificationMapHit == false {
				notificationMap[update.Source] = make(map[string]bool)
			}
			notificationMap[update.Source][update.Dest] = true
		} else {
			cache_value, cache_hit := cache[update.Type][update.Source]
			if cache_hit == false {
				cache[update.Type][update.Source] = 1
			} else {
				cache[update.Type][update.Source] = cache_value + 1
			}
		}
		timeElapsed := time.Since(lastLog)
		if timeElapsed.Seconds() >= 10 {
			zap.L().Info("METRIC UDPATE", zap.Any("metrics", cache), zap.Duration("timeSinceLastLog", timeElapsed))
			zap.L().Info("NOTIFICATION MAP", zap.Any("map", notificationMap))
			lastLog = time.Now()
			cache = make_new_metric_cache()
			// notificationMap = make(map[string]map[string]bool)
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

func subscribe_worker(msg string,
	subscriptions *Subscriptions,
	notifications chan<- Notification,
	metrics chan<- Metric,
	db *map[string]Fact) {

	event_type_len := 9
	source_len := 4
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
		go startSubscriberV3(newSubscription, notifications, copyDatabase(db), metrics)
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

func batch_worker(batch_messages <-chan string, db *map[string]Fact, subscriptions *Subscriptions) {
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
				// There is a potential for slowdown or blocking the whole broker if a subscriber won't die
				on_source_death(dying_source, db, subscriptions)
			} else if batch_message.Type == "subscriptiondeath" {
				// Assume Fact = [["id", "0004"], ["text", ..subscription id..]]
				source := batch_message.Fact[0][1]
				dying_subscription_id := batch_message.Fact[1][1]
				// This a blocking call that does a couple retracts and waits for a goroutine to die
				// There is a potential for slowdown or blocking the whole broker if a subscriber won't die
				on_subscription_death(source, dying_subscription_id, db, subscriptions)
			}
		}
		subscriberMutex.RLock()
		for _, subscription := range (*subscriptions).Subscriptions {
			subscription.batch_messages <- batch_messages
	}
		subscriberMutex.RUnlock()
	}
}

func perform_select(val string, db *map[string]Fact) (string, string) {
	subscription_data := SubscriptionData{}
	err := json.Unmarshal([]byte(val), &subscription_data)
	checkErr(err)
	query := make([]Fact, len(subscription_data.Facts))
	for i, fact_string := range subscription_data.Facts {
		query[i] = Fact{parse_fact_string(fact_string)}
	}
	results := select_facts(copyDatabase(db), query)
	return subscription_data.Id, marshal_query_result(results)
}

func select_worker(select_messages <-chan string, notifications chan<- Notification, db *map[string]Fact) {
	event_type_len := 9
	source_len := 4
	for msg := range select_messages {
		zap.L().Debug("SELECT SHOULD PARSE MESSAGE", zap.String("msg", msg))
		source := msg[event_type_len:(event_type_len + source_len)]
		val := msg[(event_type_len + source_len):]
		subscription_data_id, results_as_str := perform_select(val, db)
		notifications <- Notification{source, subscription_data_id, results_as_str, "select"}
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
	return os.Getenv(env) + "/programmable-space/"
}

func NewLogger() (*zap.Logger, error) {
	cfg := zap.NewDevelopmentConfig()  // zap.NewProductionConfig()
	cfg.OutputPaths = []string{
		// GetBasePath() + "broker/broker.log",
		"broker.log",
	}
	// cfg.OutputPaths = []string{"/var/log/programmable-space-broker.log"} // need to figure out permission issues
	return cfg.Build()
}

func echo(
	batch_messages chan<- string,
	metrics_messages chan<- Metric,
	db *map[string]Fact,
	subscriptions *Subscriptions,
	w http.ResponseWriter,
	r *http.Request) {

	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		zap.L().Info("upgrade websockets error:", zap.Error(err))
		return
	}
	defer c.Close()
	notifications := make(chan Notification, 1000)
	// TODO!!!!!!!!!!!! cleanup this goroutine when connection closes
	go notifier(notifications, c, metrics_messages)
	source := ""
	for {
		// first response from c.ReadMessage() is the message Type: websocket.BinaryMessage or websocket.TextMessage
		_, message, err := c.ReadMessage()
		if err != nil {
			zap.L().Info("read websockets error:", zap.Error(err))
			if source != "" {
				on_source_death(source, db, subscriptions)
			}
			break
		}
		// zap.L().Info("websockets recv:", zap.String(message))
		// err = c.WriteMessage(mt, message)
		// if err != nil {
		// 	zap.L().Info("write websockets error:", zap.Error(err))
		// 	break
		// }
		msg := string(message)
		event_type_len := 9
		source_len := 4
		event_type := msg[0:event_type_len]
		source = msg[event_type_len:(event_type_len + source_len)]
		val := msg[(event_type_len + source_len):]
		if event_type == ".....PING" {
			zap.L().Debug("got PING", zap.String("source", source), zap.String("value", val))
			notifications <- Notification{source, val, "", "ping"} // TODO: replace with own notifications
			metrics_messages <- Metric{"PING", source, ""}
		} else if event_type == "SUBSCRIBE" {
			// TODO!!!!! cleanup created subscriptions when connection dies?
			subscribe_worker(msg, subscriptions, notifications, metrics_messages, db)
			metrics_messages <- Metric{"SUBSCRIBE", source, ""}
		} else if event_type == "....BATCH" {
			batch_messages <- msg
			metrics_messages <- Metric{"BATCH", source, ""}
		} else if event_type == "...SELECT" {
			zap.L().Debug("SELECT SHOULD PARSE MESSAGE", zap.String("msg", msg))
			subscription_data_id, results_as_str := perform_select(val, db)
			notifications <- Notification{source, subscription_data_id, results_as_str, "select"}
		}
	}
}

func main() {
	logger, loggerCreateError := NewLogger() // zap.NewDevelopment()
	checkErr(loggerCreateError)
	zap.ReplaceGlobals(logger)

	factDatabase := make_fact_database()

	subscriptions := Subscriptions{}

	batch_messages := make(chan string, 1000)
	metrics_messages := make(chan Metric, 1000)

	go batch_worker(batch_messages, &factDatabase, &subscriptions)
	go metrics_worker(metrics_messages)

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		echo(batch_messages, metrics_messages, &factDatabase, &subscriptions, w, r)
	})
	checkErr(http.ListenAndServe(":8080", nil))
}
