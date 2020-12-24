import org.zeromq.ZMQ;
import java.util.UUID;
import java.util.List;
import java.util.Map;
import java.util.Iterator;

// TODO: consider replacing ResultValue and List<Map<String, ResultValue>> stuff with just JSONArray and JSONObject?
class ResultValue {
  public String type;
  public String value;
  // TODO: add getString(), getInteger(), ...
  public ResultValue(String _type, String _value) {
    type = _type;
    value = _value;
  }
  public String toString() {
    return String.format("%s:%s", type, value);
  }
}

interface SubscriptionCallback {
  public void parseResults(List<Map<String, ResultValue>> results);
}

int source_len = 4;
int SUBSCRIPTION_ID_LEN = UUID.randomUUID().toString().length();
int server_send_time_len = 13;
ZMQ.Socket subscriber;
ZMQ.Socket client;
String MY_ID_STR = "9001";
boolean server_listening = false;
Map<String, SubscriptionCallback> subscription_ids = new HashMap<String, SubscriptionCallback>();

List<Map<String, ResultValue>> parse_results(String val) {
  List<Map<String, ResultValue>> results = new ArrayList<Map<String, ResultValue>>();
  JSONArray json_val = JSONArray.parse(val);
  if (json_val != null) {
    for (int i=0; i<json_val.size(); i+=1) {
      Map<String, ResultValue> result = new HashMap<String, ResultValue>();
      JSONObject json_val_obj = json_val.getJSONObject(i);
      Iterator<String> keys = json_val_obj.keyIterator();
      while (keys.hasNext()) {
        String k = keys.next();
        if (json_val_obj.get(k) instanceof JSONArray) {
          JSONArray resultVarVal = json_val_obj.getJSONArray(k); // ["integer", "1"]
          result.put(k, new ResultValue(resultVarVal.get(0).toString(), resultVarVal.get(1).toString()));
        }
      }
      results.add(result);
    }
  }
  return results;
}

void subscribe(String[] subscriptionQueryParts, SubscriptionCallback callback) {
  String sub_id = UUID.randomUUID().toString();
  JSONObject query = new JSONObject();
  query.setString("id", sub_id);
  JSONArray values = new JSONArray();
  for (int i=0; i < subscriptionQueryParts.length; i+=1) {
    values.setString(i, subscriptionQueryParts[i]);
  }
  query.setJSONArray("facts", values);
  
  subscription_ids.put(sub_id, callback);
  
  ZMsg outMsg = new ZMsg();
  outMsg.add(new ZFrame(String.format("SUBSCRIBE%s%s", MY_ID_STR, query)));
  outMsg.send(client);
}

void cleanupMyOldStuff() {
  // [{"type": "death", "fact": [["id", MY_ID_STR]]}]
  JSONArray batch_messages = new JSONArray();
  JSONObject obj = new JSONObject();
  obj.setString("type", "death");
  JSONArray factArr = new JSONArray();
  JSONArray factPart1 = new JSONArray();
  factPart1.setString(0, "id");
  factPart1.setString(1, MY_ID_STR);
  factArr.setJSONArray(0, factPart1);
  obj.setJSONArray("fact", factArr);
  batch_messages.setJSONObject(0, obj);

  ZMsg outMsg = new ZMsg();
  outMsg.add(new ZFrame(String.format("....BATCH%s%s", MY_ID_STR, batch_messages)));
  outMsg.send(client);
}
 
void settings() {
  String init_ping_id = UUID.randomUUID().toString();
  ZMQ.Context context = ZMQ.context(1);
  client = context.socket(ZMQ.DEALER);
  client.setIdentity(MY_ID_STR.getBytes(ZMQ.CHARSET));
  client.connect("tcp://192.168.1.34:5570");
  ZMsg outMsg = new ZMsg();
  outMsg.add(new ZFrame(String.format(".....PING%s%s", MY_ID_STR, init_ping_id)));
  outMsg.send(client);
  ZMsg inMsg = ZMsg.recvMsg(client);
  println(inMsg);
  server_listening = true;
  
  cleanupMyOldStuff();
  
  subscribe(new String[]{"$ $ measured latency $lag ms at $"}, new SubscriptionCallback() {
    public void parseResults(List<Map<String, ResultValue>> results) {
      println("Got new results:");
      println(results);
    }
  });
}
 
 
void setup() {      
}
 
void draw() {
  ZMsg inMsg = ZMsg.recvMsg(client);
  //println(inMsg);
  for (ZFrame f : inMsg) {
    String rawValue = f.toString();
    //println(rawValue);
    String id = rawValue.substring(source_len, source_len + SUBSCRIPTION_ID_LEN);
    String val = rawValue.substring(source_len + SUBSCRIPTION_ID_LEN + server_send_time_len);
    //println(id);
    //println(val);
    if (subscription_ids.containsKey(id)) {
      SubscriptionCallback callback = subscription_ids.get(id);
      callback.parseResults(parse_results(val));
    } else {
      println(String.format("UNRECOGNIZED ID: %s", id));
    }
  }
}
