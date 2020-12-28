// There is no need to modify the code in this tab.
import processing.core.*;
 
public final class QuadGrid {
 
  private final PImage img;
  private final int nbrCols, nbrRows;
  private final VPoint[][] vp;
 
  // Prevent use of default constructor
  private QuadGrid() {
    img = null;
    nbrCols = nbrRows = 0;
    vp = null;
  };
 
  /**
   * 
   * <a href="/two/profile/param">@param</a> img the image must not be null
   * <a href="/two/profile/param">@param</a> nbrXslices must be >= 1
   * <a href="/two/profile/param">@param</a> nbrYslices must be >= 1
   */
  public QuadGrid(PImage img, int nbrXslices, int nbrYslices) {
    this.img = img;
    nbrCols = (nbrXslices >= 1) ? nbrXslices : 1;
    nbrRows = (nbrYslices >= 1) ? nbrYslices : 1;
    if (img != null) {
      vp = new VPoint[nbrCols+1][nbrRows+1];
      // Set corners so top-left is [0,0] and bottom-right is [image width, image height]
      float deltaU = 1.0f/nbrCols;
      float deltaV = 1.0f/nbrRows;
      for (int col = 0; col <= nbrCols; col++)
        for (int row = 0; row <= nbrRows; row++)
          vp[col][row] = new VPoint(col * deltaU, row * deltaV);
      setCorners(0, 0, img.width, 0, img.width, img.height, 0, img.height);
    } else
      vp = null;
  }
 
  /**
   * Calculate all the quad coordinates
   *  Vetices in order TL, TR, BR, BL
   */
  public void setCorners(float x0, float y0, float x1, float y1, float x2, float y2, float x3, float y3) {
    if (vp == null) return;
    // Do outer corners
    vp[0][0].setXY(x0, y0);
    vp[nbrCols][0].setXY(x1, y1);
    vp[nbrCols][nbrRows].setXY(x2, y2);
    vp[0][nbrRows].setXY(x3, y3);
    // Top row
    float deltaX = (x1 - x0) / nbrCols;
    float deltaY = (y1 - y0) / nbrRows;
    for (int col = 0; col <= nbrCols; col++)
      vp[col][0].setXY(x0 + col * deltaX, y0 + col * deltaY); 
    // Bottom row
    deltaX = (x2 - x3) / nbrCols;
    deltaY = (y2 - y3) / nbrRows;
    for (int col = 0; col <= nbrCols; col++)
      vp[col][nbrRows].setXY(x3 + col * deltaX, y3 + col * deltaY);
    // Fill each column in the grid in turn
    for (int col = 0; col <= nbrCols; col++) {
      for (int row = 1; row < nbrRows; row++) {
        VPoint vpF = vp[col][0];
        VPoint vpL = vp[col][nbrRows];
        deltaX = (vpL.x - vpF.x) / nbrRows;
        deltaY = (vpL.y - vpF.y) / nbrRows;
        vp[col][row].setXY(vpF.x + row * deltaX, vpF.y + row * deltaY);
      }
    }
  }
 
  public void drawGrid(PApplet app) {
    if (vp == null) return;
    app.textureMode(PApplet.NORMAL);
    app.noStroke(); // comment out this line to see triangles
    for (int row = 0; row < nbrRows; row++) {
      app.beginShape(PApplet.TRIANGLE_STRIP);
      app.texture(img);
      for (int col = 0; col <= nbrCols; col++) {
 
        VPoint p0 = vp[col][row];
        VPoint p1 = vp[col][row+1];
        app.vertex(p0.x, p0.y, p0.u, p0.v);
        app.vertex(p1.x, p1.y, p1.u, p1.v);
      }
      app.endShape();
    }
  }
 
  private class VPoint {
    public float x = 0;
    public float y = 0;
    public float u;
    public float v;
 
 
    public VPoint(float u, float v) {
      this.u = u;
      this.v = v;
    }
 
    public void setXY(float x, float y) {
      this.x = x;
      this.y = y;
    }
  }
}
