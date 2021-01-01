import processing.core.*;
import org.zeromq.*;
import java.util.UUID;
import java.util.Map;
import java.util.HashMap;
import processing.data.JSONArray;
import processing.data.JSONObject;

public final class Room {
  
  public String MY_ID_STR;
  public boolean server_listening;

  private final int source_len = 4;
  private final int SUBSCRIPTION_ID_LEN = UUID.randomUUID().toString().length();
  private final int server_send_time_len = 13;
  private ZMQ.Socket client;
  private Map<String, SubscriptionCallback> subscription_ids = new HashMap<String, SubscriptionCallback>();
  
  public static interface SubscriptionCallback {
    public void parseResults(JSONArray results);
  }
  
  public Room(String id) {
    // TODO: parse prog space URL from env vars
    MY_ID_STR = id;
    String init_ping_id = UUID.randomUUID().toString();
    ZMQ.Context context = ZMQ.context(1);
    client = context.socket(ZMQ.DEALER);
    client.setIdentity(MY_ID_STR.getBytes(ZMQ.CHARSET));
    String serverURL= "192.168.1.34"; // "localhost";
    String serverURLoverride = System.getenv("PROG_SPACE_SERVER_URL");
    if (serverURLoverride != null) {
      serverURL = serverURLoverride;
    }
    client.connect(String.format("tcp://%s:5570", serverURL));
    ZMsg outMsg = new ZMsg();
    outMsg.add(new ZFrame(String.format(".....PING%s%s", MY_ID_STR, init_ping_id)));
    outMsg.send(client);
    ZMsg inMsg = ZMsg.recvMsg(client, true);
    server_listening = true;
    cleanupMyOldStuff();
  }
  
  public void subscribe(String[] subscriptionQueryParts, SubscriptionCallback callback) {
    String sub_id = UUID.randomUUID().toString();
    System.out.println(String.format("New sub ID: %s", sub_id));
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
  
  public void cleanupMyOldStuff() {
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
  
  public boolean listen(boolean blockWaitForMessage) {
    ZMsg inMsg = ZMsg.recvMsg(client, blockWaitForMessage);
    if (inMsg != null) {
      for (ZFrame f : inMsg) {
        String rawValue = f.getString(ZMQ.CHARSET);
        String id = rawValue.substring(source_len, source_len + SUBSCRIPTION_ID_LEN);
        String val = rawValue.substring(source_len + SUBSCRIPTION_ID_LEN + server_send_time_len);
        if (subscription_ids.containsKey(id)) {
          SubscriptionCallback callback = subscription_ids.get(id);
          callback.parseResults(JSONArray.parse(val));
        } else {
          System.out.println(String.format("UNRECOGNIZED ID: %s", id));
          System.out.println(subscription_ids);
        }
      }
      return true;
    }
    return false;
  }
}
