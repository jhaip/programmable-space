import org.zeromq.ZMQ;
import java.util.UUID;
import java.util.List;
import java.util.Map;
import java.util.Iterator;

interface SubscriptionCallback {
  public void parseResults(JSONArray results);
}

int source_len = 4;
int SUBSCRIPTION_ID_LEN = UUID.randomUUID().toString().length();
int server_send_time_len = 13;
ZMQ.Socket subscriber;
ZMQ.Socket client;
String MY_ID_STR = "9001";
boolean server_listening = false;
Map<String, SubscriptionCallback> subscription_ids = new HashMap<String, SubscriptionCallback>();
JSONArray graphicsCache = new JSONArray();

void subscribe(String[] subscriptionQueryParts, SubscriptionCallback callback) {
  String sub_id = UUID.randomUUID().toString();
  println(String.format("New sub ID: %s", sub_id));
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

void listen() {
  ZMsg inMsg = ZMsg.recvMsg(client, true);
  println(inMsg);
  if (inMsg != null) {
    // TODO: handle big messages?
    for (ZFrame f : inMsg) {
      String rawValue = f.toString();
      //println(rawValue);
      String id = rawValue.substring(source_len, source_len + SUBSCRIPTION_ID_LEN);
      String val = rawValue.substring(source_len + SUBSCRIPTION_ID_LEN + server_send_time_len);
      //println(id);
      //println(val);
      if (subscription_ids.containsKey(id)) {
        SubscriptionCallback callback = subscription_ids.get(id);
        callback.parseResults(JSONArray.parse(val));
      } else {
        println(String.format("UNRECOGNIZED ID: %s", id));
        println(subscription_ids);
      }
    }
  }
}
 
void settings() {
  size(1280, 600);
  String init_ping_id = UUID.randomUUID().toString();
  ZMQ.Context context = ZMQ.context(1);
  client = context.socket(ZMQ.DEALER);
  client.setIdentity(MY_ID_STR.getBytes(ZMQ.CHARSET));
  client.connect("tcp://192.168.1.34:5570");
  ZMsg outMsg = new ZMsg();
  outMsg.add(new ZFrame(String.format(".....PING%s%s", MY_ID_STR, init_ping_id)));
  outMsg.send(client);
  ZMsg inMsg = ZMsg.recvMsg(client, true);
  println(inMsg);
  server_listening = true;
  
  cleanupMyOldStuff();
  
  //subscribe(new String[]{"$ $ measured latency $lag ms at $"}, new SubscriptionCallback() {
  subscribe(new String[]{"$ $ draw graphics $graphics on 2040"}, new SubscriptionCallback() {
    public void parseResults(JSONArray results) {
      println("Got new results:");
      println(results);
      graphicsCache = new JSONArray();
      for (int i = 0; i < results.size(); i += 1) {
        println("Potential graphics:");
        println(results.getJSONObject(i).getJSONArray("graphics").getString(1));
        JSONArray parsedGraphics = JSONArray.parse(results.getJSONObject(i).getJSONArray("graphics").getString(1));
        if (parsedGraphics != null) {
          for (int j = 0; j < parsedGraphics.size(); j += 1) {
            graphicsCache.append(parsedGraphics.getJSONObject(j));
          }  
        }
      }
    }
  });
}
 
 
void setup() {
}
 
void draw() {
  listen();
  textSize(72);
  textAlign(LEFT, TOP);
  for (int i = 0; i < graphicsCache.size(); i += 1) {
    JSONObject g = graphicsCache.getJSONObject(i);
    JSONObject opt = g.getJSONObject("options");
    String opt_type = g.getString("type");
    println("opt");
    println(opt);
    if (opt_type.equals("text")) {
      text(opt.getString("text"), opt.getFloat("x"), opt.getFloat("y"));
    }
  }
}
