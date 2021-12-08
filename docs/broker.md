## Broker

![Broker diagram](/docs/broker-diagram.png?raw=true)

Main state:

- List of active subscriptions
- Fact Table - array of facts in memory

Main loop:

- Receive event. Event = (type, source, value)
- type = PING -> Send blank notification messages to {source}
- type = BATCH -> forward event to Batch Handler
- type = SUBSCRIBE -> forward event to Subscribe Handler

Notification Sender:

- Keep cache of the last value send to a (source, subscription ID)
- For all notifications (source, subscription ID, list of results)
  - if (source, subscription ID) not in cache or if list of results is different than cached value:
    - Send message to {source}

Batch Worker

- For each event (source, value):
  - JSON parse string value into list of claims and retracts
  - For each claim or retract in list: perform update on main fact table
  - Forward list of claims and retracts to all subscriber workers

Subscribe Handler

- For each subscription request event (source, value):
  - JSON parse string value into (subscription ID, query (list of facts))
  - Claim subscription as a fact to the room
  - Add subscription to list of active subscriptions
  - Start new subscriber worker

Subscriber worker

- Save a filtered fact table based on each query part of the subscription
- Listen for messages forwarded from the Batch Worker
  - do the claim/retract updates on each of the filtered fact tables
  - if facts in fact table were updated: calculate new results and forward them to the notification worker

Fact Table / Database

- Term = (Type string, Value string)
- Fact = []Term
- Database = map[serialized fact to string] -> Fact
- Claim (fact):
  - Database[serialized(fact)] = fact
- Retract (query):
  - if query has no variables or wildcards:
    - For all facts in Database:
      - if match(): delete from Database
  - otherwise: delete from Database
- match(): Datalog query match
- Message format (program ID, subscription ID, rest of fact...)
