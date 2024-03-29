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
import websockets.*;

import java.io.File;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.net.URI;
import java.nio.file.Paths;

class MaybeMovie {
  public Movie movie;
  public boolean loaded;
  public MaybeMovie(Movie movie) {
    this.movie = movie;
    this.loaded = true;
  }
  public MaybeMovie() {
    this.loaded = false;
  }
}

boolean getIsUrl(String filenameOrURL) {
  return filenameOrURL.contains("://");
}

String getNormalizedFilename(String filenameOrURL) {
  if (filenameOrURL.contains("://")) {
    try {
      return Paths.get(new URI(filenameOrURL).getPath()).getFileName().toString();
    } catch(Exception e) {
      return "error-filename";
    }
  }
  return filenameOrURL;
}

class VideoDownloader implements Runnable {
  PApplet papp;
  String url;
  String filename;

  public VideoDownloader(PApplet papp, String url) {
    this.papp = papp;
    this.url = url;
    this.filename = getNormalizedFilename(url);
  }

  public void run() {
    try {
      String filePath = papp.dataPath(filename);
      File tempFile = new File(filePath);
      if (!tempFile.exists()) {
        System.out.println("loading file");
        boolean success = papp.saveStream( filePath, url );
        System.out.println(success);
        if (!success) {
          return;
        }
      }
      Movie newMovie = new Movie(papp, filePath);
      newMovie.loop();   
      movies_cache.put(url, new MaybeMovie(newMovie));
      System.out.println(String.format("done loading video %s", url));
    } catch(Exception e) {
      System.out.println(String.format("could not encode url %s", url));
    }
  }
}

class ImageDownloader implements Runnable {
  PApplet papp;
  String url;

  public ImageDownloader(PApplet papp, String url) {
    this.papp = papp;
    this.url = url;
  }

  public void run() {
    try {
      System.out.println(String.format("start loading image %s", url));
      String imgExt = "png";
      if (url.toLowerCase().contains(".gif")) {
        imgExt = "gif";
      } else if (url.toLowerCase().contains(".jpg") || url.toLowerCase().contains(".jpeg")) {
        imgExt = "jpg";
      }
      PImage img = loadImage(url, imgExt);
      images_cache.put(url, img);
      System.out.println(String.format("done loading image %s", url));
    } catch(Exception e) {
      System.out.println(String.format("error loading image %s", url));
    }
  }
}

JSONArray graphicsCache = new JSONArray();
PFont mono;
Map<String, MaybeMovie> movies_cache = new HashMap<String, MaybeMovie>();
Map<String, PImage> images_cache = new HashMap<String, PImage>();
Map<String, int[]> colorsMap = new HashMap<String, int[]>();
Map<String, int[]> sourcePosition = new HashMap<String, int[]>();
Map<String, JSONArray> sourceGraphics = new HashMap<String, JSONArray>();
Map<String, PGraphics> sourcePGraphics = new HashMap<String, PGraphics>();
PGraphics uncalibratedScene;
QuadGrid qgrid;
WebsocketClient wsc;
Room room;
final int sourceCanvasWidth = 1920;
final int sourceCanvasHeight = 1080;
int[] DEFAULT_PROJECTOR_CALIBRATION;
int[] PROJECTOR_CALIBRATION;
String myId;
boolean inDebugMode;

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

void parseUpdatedGraphics(PApplet thisApp, JSONArray results) {
  println(String.format("Got new results, size %s", results.size()));
  // println(results);
  graphicsCache = new JSONArray();
  Map<String, Boolean> referencedVideos = new HashMap<String, Boolean>();
  Map<String, Boolean> referencedImages = new HashMap<String, Boolean>();
  sourceGraphics = new HashMap<String, JSONArray>();
  sourcePosition = new HashMap<String, int[]>();
  // TODO: we could not clear the PGraphics ever time if that is more efficient
  // sourcePGraphics = new HashMap<String, PGraphics>();
  for (int i = 0; i < results.size(); i += 1) {
    // println("Potential graphics:");
    // println(results.getJSONObject(i).getJSONArray("graphics").getString(1));
    JSONObject result = results.getJSONObject(i);
    JSONArray parsedGraphics = JSONArray.parse(result.getJSONArray("graphics").getString(1));
    String source = result.getJSONArray("programNumber").getString(1);
    JSONObject resetGraphics = new JSONObject();
    resetGraphics.setString("type", "__RESET__");
    if (parsedGraphics != null) {
      if (!sourcePGraphics.containsKey(source)) {
        sourcePGraphics.put(source, thisApp.createGraphics(sourceCanvasWidth, sourceCanvasHeight, P3D)); // TODO: should a different canvas size be used?
      }
      if (!sourceGraphics.containsKey(source)) {
        sourceGraphics.put(source, new JSONArray());
        sourceGraphics.get(source).append(resetGraphics);
      }
      // only paper detection subscription passes the coordiantes of the paper
      // otherwise, fall back to using the full screen size
      if (results.getJSONObject(i).hasKey("x1")) {
        sourcePosition.put(source, new int[]{
          Integer.parseInt(result.getJSONArray("x1").getString(1)),
          Integer.parseInt(result.getJSONArray("y1").getString(1)),
          Integer.parseInt(result.getJSONArray("x2").getString(1)),
          Integer.parseInt(result.getJSONArray("y2").getString(1)),
          Integer.parseInt(result.getJSONArray("x3").getString(1)),
          Integer.parseInt(result.getJSONArray("y3").getString(1)),
          Integer.parseInt(result.getJSONArray("x4").getString(1)),
          Integer.parseInt(result.getJSONArray("y4").getString(1)),
        });
      } else {
        sourcePosition.put(source, new int[]{0, 0, width, 0, width, height, 0, height});
      }
      for (int j = 0; j < parsedGraphics.size(); j += 1) {
        sourceGraphics.get(source).append(parsedGraphics.getJSONObject(j));
        String graphicType = parsedGraphics.getJSONObject(j).getString("type");
        if (graphicType.equals("video")) {
          //println("detected video");
          referencedVideos.put(parsedGraphics.getJSONObject(j).getJSONObject("options").getString("filename"), true);
        } else if (graphicType.equals("image")) {
          referencedImages.put(parsedGraphics.getJSONObject(j).getJSONObject("options").getString("bitmap_image_base64"), true);
        }
      }
      sourceGraphics.get(source).append(resetGraphics);
    }
  }
  // load images
  for (String referencedImageStr : referencedImages.keySet()) {
    if (!images_cache.containsKey(referencedImageStr)) {
      if (getIsUrl(referencedImageStr)) {
        images_cache.put(referencedImageStr, null);
        Thread t = new Thread(new ImageDownloader(thisApp, referencedImageStr));
        t.start();
      } else {
        try {
          images_cache.put(referencedImageStr, DecodePImageFromBase64(referencedImageStr));
        } catch (Exception e) {
          println(String.format("error decoding image base64 %s", referencedImageStr));
          movies_cache.put(referencedImageStr, null);
        }
      }
    }
  }
  // TODO: clear image_cache if it gets too big.
  // stop all videos not currently being shown
  for (Map.Entry<String, MaybeMovie> entry : movies_cache.entrySet()) {
    if (!referencedVideos.containsKey(entry.getKey())) {
      if (entry.getValue().loaded) {
        //println(String.format("stopping video %s", entry.getKey()));
        entry.getValue().movie.stop();
      }
    }
  }
  // load and play new videos
  for (String referencedVideoFilename : referencedVideos.keySet()) {
    boolean hadError = false;
    try {
      if (!movies_cache.containsKey(referencedVideoFilename)) {
        String normalizedFilename = getNormalizedFilename(referencedVideoFilename);
        File tempFile = new File(normalizedFilename);
        if (tempFile.exists()) {
          Movie newMovie = new Movie(thisApp, normalizedFilename);
          movies_cache.put(referencedVideoFilename, new MaybeMovie(newMovie));
          println(String.format("loaded video %s %s", referencedVideoFilename, normalizedFilename));
        } else {
          println(String.format("file does not exist: %s %s", referencedVideoFilename, normalizedFilename));
          movies_cache.put(referencedVideoFilename, new MaybeMovie());
          if (getIsUrl(referencedVideoFilename)) {
            println("started thread to download movie");
            Thread t = new Thread(new VideoDownloader(thisApp, referencedVideoFilename));
            t.start();
          }
        }
      }
      //println(String.format("looping video %s", referencedVideoFilename));
      if (movies_cache.get(referencedVideoFilename).loaded) {
        movies_cache.get(referencedVideoFilename).movie.loop();
      }
    } catch (Exception e) {
      println(String.format("error loading video %s", referencedVideoFilename));
      movies_cache.put(referencedVideoFilename, new MaybeMovie());
    }
  }
}
 
void settings() {
  myId = "1999";
  inDebugMode = false;
  if (args != null) {
    println(args);
    if (args.length == 1) {
      myId = args[0];
    } else if (args.length == 2) {
      myId = args[0];
      inDebugMode = true;
    }
  }
  println(myId);
  colorsMap.put("white", new int[]{255, 255, 255});
  colorsMap.put("red", new int[]{255, 0, 0});
  colorsMap.put("green", new int[]{0, 255, 0});
  colorsMap.put("blue", new int[]{0, 0, 255});
  colorsMap.put("black", new int[]{0, 0, 0});
  colorsMap.put("yellow", new int[]{255, 255, 0});
  colorsMap.put("purple", new int[]{128, 0, 128});
  colorsMap.put("cyan", new int[]{0, 255, 255});
  colorsMap.put("orange", new int[]{255, 165, 0});
  fullScreen(P3D);
  //size(1280, 600, P3D);

  println("connecting to broker");
  println(Room.getServerUrl());
  wsc = new WebsocketClient(this, Room.getServerUrl());
  room = new Room(wsc, myId);
  
  final PApplet _thisApp = this;
  
  room.subscribe(new String[]{
    "$ $ camera $cam has projector calibration TL ($x1, $y1) TR ($x2, $y2) BR ($x3, $y3) BL ($x4, $y4) @ $",
    String.format("$ $ camera $cam should calibrate to $dx1 $dy1 $dx2 $dy2 $dx3 $dy3 $dx4 $dy4 on display %s", myId)
  }, new Room.SubscriptionCallback() {
    public void parseResults(JSONArray results) {
      for (int i = 0; i < results.size(); i += 1) {
        JSONObject r = results.getJSONObject(i);
        PROJECTOR_CALIBRATION = new int[]{
          Integer.parseInt(r.getJSONArray("x1").getString(1)),
          Integer.parseInt(r.getJSONArray("y1").getString(1)),
          Integer.parseInt(r.getJSONArray("x2").getString(1)),
          Integer.parseInt(r.getJSONArray("y2").getString(1)),
          Integer.parseInt(r.getJSONArray("x3").getString(1)),
          Integer.parseInt(r.getJSONArray("y3").getString(1)),
          Integer.parseInt(r.getJSONArray("x4").getString(1)),
          Integer.parseInt(r.getJSONArray("y4").getString(1)),
        };
      }
      if (results.size() == 0) {
        PROJECTOR_CALIBRATION = DEFAULT_PROJECTOR_CALIBRATION;        
      }
    }
  });

  room.subscribe(new String[]{
    String.format("$ $ default display for $programNumber is %s", myId),
    "$ $ draw graphics $graphics on $programNumber"
  }, new Room.SubscriptionCallback() {
    public void parseResults(JSONArray results) {
      parseUpdatedGraphics(_thisApp, results);
    }
  });
  
  /*
  room.subscribe(new String[]{
    "$ $ camera $cam sees paper $programNumber at TL ($x1, $y1) TR ($x2, $y2) BR ($x3, $y3) BL ($x4, $y4) @ $t2",
    String.format("$ $ camera $cam should calibrate to $ $ $ $ $ $ $ $ on display %s", myId),
    "$ $ draw graphics $graphics on $programNumber"
  }, new Room.SubscriptionCallback() {
    public void parseResults(JSONArray results) {
      parseUpdatedGraphics(_thisApp, results);
    }
  });
  */
  
  room.subscribe(new String[]{
    String.format("$programNumber $ draw graphics $graphics on %s", myId)
  }, new Room.SubscriptionCallback() {
    public void parseResults(JSONArray results) {
      try {
        parseUpdatedGraphics(_thisApp, results);
      } catch (Exception e) {
        println("EXCEPTION!, skipping");
        println(e);
      }
      
    }
  });

  room.sendPing();
}
 
void setup() {
  mono = createFont("Inconsolata-Regular.ttf", 32);
  //noSmooth();
  //hint(DISABLE_TEXTURE_MIPMAPS);
  //((PGraphicsOpenGL)g).textureSampling(3);
  uncalibratedScene = createGraphics(width, height, P3D);
   DEFAULT_PROJECTOR_CALIBRATION = new int[]{0, 0, width, 0, width, height, 0, height};
  //DEFAULT_PROJECTOR_CALIBRATION = new int[]{453, 140, 1670, 160, 1646, 889, 443, 858};
  PROJECTOR_CALIBRATION = DEFAULT_PROJECTOR_CALIBRATION;
}

void webSocketEvent(String msg) {
  room.parseRecvMessage(msg);
}

void webSocketConnectEvent(String uid, String ip) {
  println("Someone connected", uid, ip);
}
  
void webSocketDisconnectEvent(String uid, String ip) {
  println("Someone disconnected", uid, ip);
}
 
void draw() {
  room.sendPingIfNeeded();
  long start = System.currentTimeMillis();
  long listenTime = System.currentTimeMillis() - start;
  background(0, 0, 0);
  uncalibratedScene.beginDraw();
  //uncalibratedScene.blendMode(BLEND);
  uncalibratedScene.background(0, 0, 0);
  uncalibratedScene.textureMode(NORMAL);
  //println(sourceGraphics);
  for (Map.Entry<String, JSONArray> entry : sourceGraphics.entrySet()) {
    String source = entry.getKey();
    // uncalibratedScene.pushMatrix();
    PGraphics pg;
    try {
      pg = drawSource(sourcePGraphics.get(source), entry.getValue());
    } catch (Exception e) {
      println("error when calling drawSource");
      println(e);
      continue;
    }
    /*
    uncalibratedScene.beginShape();
    uncalibratedScene.texture(pg);
    // TODO: offset horizontals to match the real aspect ratio of the paper
    try {
      int[] sp = sourcePosition.get(source);
      uncalibratedScene.vertex(sp[0], sp[1], 0, 0);
      uncalibratedScene.vertex(sp[2], sp[3], 1, 0);
      uncalibratedScene.vertex(sp[4], sp[5], 1, 1);
      uncalibratedScene.vertex(sp[6], sp[7], 0, 1);
    } catch (Exception e) {
      uncalibratedScene.vertex(0, 0, 0, 0);
      uncalibratedScene.vertex(width, 0, 1, 0);
      uncalibratedScene.vertex(width, height, 1, 1);
      uncalibratedScene.vertex(0, height, 0, 1);
    }
    uncalibratedScene.endShape();
    */
    qgrid = new QuadGrid(pg, 10, 10); // second and third parameters are the v and h resolutions
    try {
      int[] sp = sourcePosition.get(source);
      qgrid.setCorners(sp[0], sp[1],
                       sp[2], sp[3],
                       sp[4], sp[5],
                       sp[6], sp[7]);
    } catch (Exception e) {
      qgrid.setCorners(0, 0,
                       width, 0,
                       width, height,
                       0, height);
    }
    qgrid.drawGridPGraphics(uncalibratedScene, this);
    
    // uncalibratedScene.popMatrix();
  }
  uncalibratedScene.endDraw();
  long drawPapersTime = System.currentTimeMillis() - start;
  //qgrid = new QuadGrid(uncalibratedScene, 10, 10); // second and third parameters are the v and h resolutions
  //qgrid.setCorners(PROJECTOR_CALIBRATION[0], PROJECTOR_CALIBRATION[1],
  //                 PROJECTOR_CALIBRATION[2], PROJECTOR_CALIBRATION[3],
  //                 PROJECTOR_CALIBRATION[4], PROJECTOR_CALIBRATION[5],
  //                 PROJECTOR_CALIBRATION[6], PROJECTOR_CALIBRATION[7]);
  //qgrid.drawGrid(this);
  image(uncalibratedScene, 0, 0);
  if (inDebugMode) {
    fill(255, 255, 0);
    text(frameRate, 25, 25);
    long finalTime = System.currentTimeMillis() - start;
    text(listenTime, 25, 75);
    text(drawPapersTime, 25, 100);
    text(finalTime, 25, 125);
  }
}

PGraphics drawSource(PGraphics pg, JSONArray graphicsCache) {
  pg.beginDraw();
  pg.pushMatrix();
  pg.background(0, 0, 0, 0);
  pg.fill(255);
  pg.stroke(255);
  pg.strokeWeight(5);
  pg.textAlign(LEFT, TOP);
  pg.textFont(mono);
  pg.textSize(72);
  pg.ellipseMode(CORNER);
  //pg.resetMatrix();
  boolean transformInUse = false;
  for (int i = 0; i < graphicsCache.size(); i += 1) {
    JSONObject g = graphicsCache.getJSONObject(i);
    String opt_type = g.getString("type");
    if (opt_type.equals("__RESET__")) {
      if (transformInUse) {
        pg.popMatrix();
        transformInUse = false;
      }
      pg.fill(255);
      pg.stroke(255);
      pg.strokeWeight(5);
      pg.textAlign(LEFT, TOP);
      pg.textFont(mono);
      pg.textSize(72);
      pg.ellipseMode(CORNER);
    } else if (opt_type.equals("rectangle")) {
      JSONObject opt = g.getJSONObject("options");
      pg.rect(opt.getFloat("x"), opt.getFloat("y"), opt.getFloat("w"), opt.getFloat("h"));
    } else if (opt_type.equals("ellipse")) {
      JSONObject opt = g.getJSONObject("options");
      pg.ellipse(opt.getFloat("x"), opt.getFloat("y"), opt.getFloat("w"), opt.getFloat("h"));
    } else if (opt_type.equals("line")) {
      JSONArray opt = g.getJSONArray("options");
      pg.line(opt.getFloat(0), opt.getFloat(1), opt.getFloat(2), opt.getFloat(3));
    } else if (opt_type.equals("polygon")) {
      JSONArray opt = g.getJSONArray("options");
      pg.beginShape();
      for (int q = 0; q < opt.size(); q += 1) {
        JSONArray pt = opt.getJSONArray(q);
        pg.vertex(pt.getFloat(0), pt.getFloat(1));
      }
      pg.endShape();
    } else if (opt_type.equals("text")) {
      JSONObject opt = g.getJSONObject("options");
      pg.text(opt.getString("text"), opt.getFloat("x"), opt.getFloat("y"));
    } else if (opt_type.equals("fill") || opt_type.equals("fontcolor")) {
      if (g.get("options") instanceof String) {
        String opt = g.get("options").toString();
        if (colorsMap.containsKey(opt)) {
          int[] col = colorsMap.get(opt);
          pg.fill(col[0], col[1], col[2]);
        }
      } else {
        JSONArray opt = g.getJSONArray("options");
        if (opt.size() == 3) {
          pg.fill(opt.getFloat(0), opt.getFloat(1), opt.getFloat(2));
        } else if (opt.size() == 4) {
          pg.fill(opt.getFloat(0), opt.getFloat(1), opt.getFloat(2), opt.getFloat(3));
        }
      }
    } else if (opt_type.equals("stroke")) {
      if (g.get("options") instanceof String) {
        String opt = g.get("options").toString();
        if (colorsMap.containsKey(opt)) {
          int[] col = colorsMap.get(opt);
          pg.stroke(col[0], col[1], col[2]);
        }
      } else {
        JSONArray opt = g.getJSONArray("options");
        if (opt.size() == 3) {
          pg.stroke(opt.getFloat(0), opt.getFloat(1), opt.getFloat(2));
        } else if (opt.size() == 4) {
          pg.stroke(opt.getFloat(0), opt.getFloat(1), opt.getFloat(2), opt.getFloat(3));
        }
      }
    } else if (opt_type.equals("nofill")) {
      pg.noFill();
    } else if (opt_type.equals("nostroke")) {
      pg.noStroke();
    } else if (opt_type.equals("strokewidth")) {
      float val = g.getFloat("options");
      pg.strokeWeight(val);
    } else if (opt_type.equals("fontsize")) {
      int opt_font_size = g.getInt("options");
      pg.textSize(opt_font_size);
    } else if (opt_type.equals("push")) {
      pg.pushMatrix();
    } else if (opt_type.equals("pop")) {
      pg.popMatrix();
    } else if (opt_type.equals("translate")) {
      JSONObject opt = g.getJSONObject("options");
      pg.translate(opt.getFloat("x"), opt.getFloat("y"));
    } else if (opt_type.equals("rotate")) {
      float val = g.getFloat("options");
      pg.rotate(val);
    } else if (opt_type.equals("scale")) {
      JSONObject opt = g.getJSONObject("options");
      pg.scale(opt.getFloat("x"), opt.getFloat("y"));
    } else if (opt_type.equals("transform")) {
      JSONArray opt = g.getJSONArray("options");
      // warnining from Processing.org:
      // "This is very slow because it will try to calculate the inverse of the transform, so avoid it whenever possible"
      if (transformInUse == false) {
        transformInUse = true;
        pg.pushMatrix();
        pg.applyMatrix(opt.getFloat(0), opt.getFloat(1), 0, opt.getFloat(2),
                       opt.getFloat(3), opt.getFloat(4), 0, opt.getFloat(5),
                       0,               0,               1.0,             0,
                       opt.getFloat(6), opt.getFloat(7), 0,               1.0);
        //pg.printMatrix();
      }
      
    } else if (opt_type.equals("image")) {
      JSONObject opt = g.getJSONObject("options");
      String imageStr = opt.getString("bitmap_image_base64");
      if (images_cache.containsKey(imageStr)) {
        if (images_cache.get(imageStr) != null) {
          pg.image(images_cache.get(imageStr), opt.getFloat("x"), opt.getFloat("y"), opt.getFloat("w"), opt.getFloat("h"));
        } else {
          pg.pushMatrix();
          pg.fill(255, 0, 255);
          pg.rect(opt.getFloat("x"), opt.getFloat("y"), opt.getFloat("w"), opt.getFloat("h"));
          pg.popMatrix();
        }
      }
    } else if (opt_type.equals("video")) {
      JSONObject opt = g.getJSONObject("options");
      String videoFilename = opt.getString("filename");
      if (movies_cache.containsKey(videoFilename)) {
        if (movies_cache.get(videoFilename) != null && movies_cache.get(videoFilename).loaded) {
          try {
            pg.image(movies_cache.get(videoFilename).movie, opt.getFloat("x"), opt.getFloat("y"), opt.getFloat("w"), opt.getFloat("h"));
          } catch (Exception e) {
            pg.pushMatrix();
            pg.fill(255, 255, 0);
            pg.rect(opt.getFloat("x"), opt.getFloat("y"), opt.getFloat("w"), opt.getFloat("h"));
            pg.popMatrix();      
          }
        } else {
          pg.pushMatrix();
          pg.fill(255, 0, 0);
          pg.rect(opt.getFloat("x"), opt.getFloat("y"), opt.getFloat("w"), opt.getFloat("h"));
          pg.popMatrix();
        }
      }
    } else {
      println(g);
    }
  }
  pg.popMatrix();
  pg.endDraw();
  return pg;
}
