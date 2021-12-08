import processing.core.*;
import java.util.ArrayList;
import java.util.UUID;
import java.util.Map;
import java.util.HashMap;
import processing.data.JSONArray;
import processing.data.JSONObject;
import processing.data.StringList;
import websockets.*;

public final class Room {
  
  public String MY_ID_STR;
  public String init_ping_id;
  public boolean server_listening;

  private final int source_len = 4;
  private final int SUBSCRIPTION_ID_LEN = UUID.randomUUID().toString().length();
  private final int server_send_time_len = 13;
  private WebsocketClient wsclient;
  private Map<String, SubscriptionCallback> subscription_ids = new HashMap<String, SubscriptionCallback>();
  private ArrayList<String> queuedMessages;
  private long lastPingTimeMs;
  
  public static interface SubscriptionCallback {
    public void parseResults(JSONArray results);
  }

  public static String getServerUrl() {
    String serverURL= "192.168.1.34"; // "localhost";
    String serverURLoverride = System.getenv("PROG_SPACE_SERVER_URL");
    if (serverURLoverride != null) {
      serverURL = serverURLoverride;
    }
    return String.format("ws://%s:8080/", serverURL);
  }
  
  public Room(WebsocketClient in_wsclient, String id) {
    queuedMessages = new ArrayList<String>();
    MY_ID_STR = id;
    wsclient = in_wsclient;
  }

  public void sendPing() {
    System.out.println("sending ping");
    init_ping_id = UUID.randomUUID().toString();
    wsclient.sendMessage(String.format(".....PING%s%s", MY_ID_STR, init_ping_id));
    lastPingTimeMs = System.currentTimeMillis();
  }

  public void sendPingIfNeeded() {
    // send ping once in a while to keep the ws conection alive
    if (System.currentTimeMillis() - lastPingTimeMs > 30*1000) {
      sendPing();
    }
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
    
    String msg = String.format("SUBSCRIBE%s%s", MY_ID_STR, query.toString().replace("\n", "").replace("  ", ""));
    queuedMessages.add(msg);
    // if (server_listening) {
    //   wsclient.sendMessage(msg);
    // } else {
    //   queuedMessages.add(msg);
    // }
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
  
    wsclient.sendMessage(String.format("....BATCH%s%s", MY_ID_STR, batch_messages));
  }

  public void parseRecvMessage(String rawValue){
    String id = rawValue.substring(source_len, source_len + SUBSCRIPTION_ID_LEN);
    String val = rawValue.substring(source_len + SUBSCRIPTION_ID_LEN + server_send_time_len);
    if (new String(id).equals(init_ping_id)) {
      System.out.println("ping response");
      if (server_listening == false) {
        System.out.println(String.format("server_listening now true, sending %s queued messages", queuedMessages.size()));
        server_listening = true;
        cleanupMyOldStuff();
        for (int i=0; i < queuedMessages.size(); i++) {
          String msg = queuedMessages.get(i);
          System.out.println(msg);
          wsclient.sendMessage(msg);
        }
        queuedMessages.clear();
      }
    } else if (subscription_ids.containsKey(id)) {
      System.out.println(val);
      SubscriptionCallback callback = subscription_ids.get(id);
      callback.parseResults(JSONArray.parse(val));
    } else {
      System.out.println(String.format("UNRECOGNIZED ID: %s", id));
      System.out.println(subscription_ids);
      System.out.println(init_ping_id);
    }
  }
}
