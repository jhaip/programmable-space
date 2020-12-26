import org.zeromq.ZMQ;
import java.util.UUID;
import java.util.List;
import java.util.Map;
import java.util.Iterator;
import java.io.DataOutputStream;
import java.io.ByteArrayInputStream;
import java.awt.Image;
import java.awt.Toolkit;
import java.awt.image.BufferedImage;
import java.util.Base64;
import javax.imageio.ImageIO;

import processing.video.*;

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
PFont mono;
Map<String, Movie> movies_cache = new HashMap<String, Movie>();

Map<String, int[]> colorsMap = new HashMap<String, int[]>();

PImage DecodePImageFromBase64(String i_Image64) throws IOException {
   PImage result = null;
   byte[] decodedBytes = Base64.getDecoder().decode(i_Image64);
 
   ByteArrayInputStream in = new ByteArrayInputStream(decodedBytes);
   BufferedImage bImageFromConvert = ImageIO.read(in);
   BufferedImage convertedImg = new BufferedImage(bImageFromConvert.getWidth(),     bImageFromConvert.getHeight(), BufferedImage.TYPE_INT_ARGB);
   convertedImg.getGraphics().drawImage(bImageFromConvert, 0, 0, null);
   result = new PImage(convertedImg);
 
   return result;
}

void movieEvent(Movie m) {
  m.read();
}

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
  ZMsg inMsg = ZMsg.recvMsg(client, false);
  //println("inMsg:");
  //println(inMsg.dump());
  //OutputStream os = createOutput(String.format("zmq_save_%s.txt", UUID.randomUUID().toString()));
  //DataOutputStream dos = new DataOutputStream(os);
  //try {
  //  ZMsg.save(inMsg, dos);
  //  dos.close();
  //  println("closed");
  //}
  //catch (IOException e) { println("Error: " + e); }
  if (inMsg != null) {
    for (ZFrame f : inMsg) {
      String rawValue = f.getString(ZMQ.CHARSET);
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
  colorsMap.put("white", new int[]{255, 255, 255});
  colorsMap.put("red", new int[]{255, 0, 0});
  colorsMap.put("green", new int[]{0, 255, 0});
  colorsMap.put("blue", new int[]{0, 0, 255});
  colorsMap.put("black", new int[]{0, 0, 0});
  colorsMap.put("yellow", new int[]{255, 255, 0});
  colorsMap.put("purple", new int[]{128, 0, 128});
  colorsMap.put("cyan", new int[]{0, 255, 255});
  colorsMap.put("orange", new int[]{255, 165, 0});
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
  
  final PApplet _thisApp = this;
  
  //subscribe(new String[]{"$ $ measured latency $lag ms at $"}, new SubscriptionCallback() {
  subscribe(new String[]{"$ $ draw graphics $graphics on 1999"}, new SubscriptionCallback() {
    public void parseResults(JSONArray results) {
      //println("Got new results:");
      //println(results);
      JSONObject resetGraphics = new JSONObject();
      resetGraphics.setString("type", "__RESET__");
      graphicsCache = new JSONArray();
      graphicsCache.append(resetGraphics);
      Map<String, Boolean> referencedVideos = new HashMap<String, Boolean>();
      for (int i = 0; i < results.size(); i += 1) {
        //println("Potential graphics:");
        //println(results.getJSONObject(i).getJSONArray("graphics").getString(1));
        JSONArray parsedGraphics = JSONArray.parse(results.getJSONObject(i).getJSONArray("graphics").getString(1));
        if (parsedGraphics != null) {
          for (int j = 0; j < parsedGraphics.size(); j += 1) {
            graphicsCache.append(parsedGraphics.getJSONObject(j));
            if (parsedGraphics.getJSONObject(j).getString("type").equals("video")) {
              //println("detected video");
              referencedVideos.put(parsedGraphics.getJSONObject(j).getJSONObject("options").getString("filename"), true);
            }
          }
          graphicsCache.append(resetGraphics);
        }
      }
      // stop all videos not currently being shown
      for (Map.Entry<String, Movie> entry : movies_cache.entrySet()) {
        if (!referencedVideos.containsKey(entry.getKey())) {
          println(String.format("stopping video %s", entry.getKey()));
          entry.getValue().stop();
        }
      }
      // load and play new videos
      for (String referencedVideoFilename : referencedVideos.keySet()) {
        if (!movies_cache.containsKey(referencedVideoFilename)) {
          movies_cache.put(referencedVideoFilename, new Movie(_thisApp, referencedVideoFilename));
          println(String.format("loaded video %s", referencedVideoFilename));
        }
        println(String.format("looping video %s", referencedVideoFilename));
        movies_cache.get(referencedVideoFilename).loop();
      }
    }
  });
  
  listen();
}
 
 
void setup() {
  mono = createFont("Inconsolata-Regular.ttf", 32);
}
 
void draw() {
  listen();
  background(0);
  for (int i = 0; i < graphicsCache.size(); i += 1) {
    JSONObject g = graphicsCache.getJSONObject(i);
    String opt_type = g.getString("type");
    if (opt_type.equals("__RESET__")) {
      fill(255);
      stroke(255);
      strokeWeight(1);
      textAlign(LEFT, TOP);
      textFont(mono);
      textSize(72);
      ellipseMode(CENTER);
      resetMatrix();
    } else if (opt_type.equals("rectangle")) {
      JSONObject opt = g.getJSONObject("options");
      rect(opt.getFloat("x"), opt.getFloat("y"), opt.getFloat("w"), opt.getFloat("h"));
    } else if (opt_type.equals("ellipse")) {
      JSONObject opt = g.getJSONObject("options");
      ellipse(opt.getFloat("x"), opt.getFloat("y"), opt.getFloat("w"), opt.getFloat("h"));
    } else if (opt_type.equals("line")) {
      JSONArray opt = g.getJSONArray("options");
      line(opt.getFloat(0), opt.getFloat(1), opt.getFloat(2), opt.getFloat(3));
    } else if (opt_type.equals("polygon")) {
      JSONArray opt = g.getJSONArray("options");
      beginShape();
      for (int q = 0; q < opt.size(); q += 1) {
        JSONArray pt = opt.getJSONArray(q);
        vertex(pt.getFloat(0), pt.getFloat(1));
      }
      endShape();
    } else if (opt_type.equals("text")) {
      JSONObject opt = g.getJSONObject("options");
      text(opt.getString("text"), opt.getFloat("x"), opt.getFloat("y"));
    } else if (opt_type.equals("fill") || opt_type.equals("fontcolor")) {
      if (g.get("options") instanceof String) {
        String opt = g.get("options").toString();
        if (colorsMap.containsKey(opt)) {
          int[] col = colorsMap.get(opt);
          fill(col[0], col[1], col[2]);
        }
      } else {
        JSONArray opt = g.getJSONArray("options");
        if (opt.size() == 3) {
          fill(opt.getFloat(0), opt.getFloat(1), opt.getFloat(2));
        } else if (opt.size() == 4) {
          fill(opt.getFloat(0), opt.getFloat(1), opt.getFloat(2), opt.getFloat(3));
        }
      }
    } else if (opt_type.equals("stroke")) {
      if (g.get("options") instanceof String) {
        String opt = g.get("options").toString();
        if (colorsMap.containsKey(opt)) {
          int[] col = colorsMap.get(opt);
          stroke(col[0], col[1], col[2]);
        }
      } else {
        JSONArray opt = g.getJSONArray("options");
        if (opt.size() == 3) {
          stroke(opt.getFloat(0), opt.getFloat(1), opt.getFloat(2));
        } else if (opt.size() == 4) {
          stroke(opt.getFloat(0), opt.getFloat(1), opt.getFloat(2), opt.getFloat(3));
        }
      }
    } else if (opt_type.equals("nofill")) {
      noFill();
    } else if (opt_type.equals("nostroke")) {
      noStroke();
    } else if (opt_type.equals("strokewidth")) {
      float val = g.getFloat("options");
      strokeWeight(val);
    } else if (opt_type.equals("fontsize")) {
      int opt_font_size = g.getInt("options");
      textSize(opt_font_size);
    } else if (opt_type.equals("push")) {
      push();
    } else if (opt_type.equals("pop")) {
      pop();
    } else if (opt_type.equals("translate")) {
      JSONObject opt = g.getJSONObject("options");
      translate(opt.getFloat("x"), opt.getFloat("y"));
    } else if (opt_type.equals("rotate")) {
      float val = g.getFloat("options");
      rotate(val);
    } else if (opt_type.equals("scale")) {
      JSONObject opt = g.getJSONObject("options");
      scale(opt.getFloat("x"), opt.getFloat("y"));
    } else if (opt_type.equals("transform")) {
      JSONArray opt = g.getJSONArray("options");
      // warnining from Processing.org:
      // "This is very slow because it will try to calculate the inverse of the transform, so avoid it whenever possible"
      applyMatrix(opt.getFloat(0), opt.getFloat(1), opt.getFloat(2), 0,
                  opt.getFloat(3), opt.getFloat(4), opt.getFloat(5), 0,
                  opt.getFloat(6), opt.getFloat(7), opt.getFloat(8), 0,
                  0,               0,               0,               1.0);
    } else if (opt_type.equals("image")) {
      JSONObject opt = g.getJSONObject("options");
      try {
        PImage img = DecodePImageFromBase64(opt.getString("bitmap_image_base64"));
        image(img, opt.getFloat("x"), opt.getFloat("y"), opt.getFloat("w"), opt.getFloat("h"));
      }
      catch (IOException e) { println("Error: " + e); }
    } else if (opt_type.equals("video")) {
      JSONObject opt = g.getJSONObject("options");
      String videoFilename = opt.getString("filename");
      if (movies_cache.containsKey(videoFilename)) {
        image(movies_cache.get(videoFilename), opt.getFloat("x"), opt.getFloat("y"), opt.getFloat("w"), opt.getFloat("h"));
      }
    } else {
      print(g);
    }
  }
}
