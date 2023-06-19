// <![CDATA[

// Get query parameters from the url.  This returns an object like this:
//	?param	=> args['param']=true
// ?param=value	  => args['param']=value
// ?param[]=value	=> args['param']=[value,...]
function get_args() {
  var args = new Object();

  var query_string = location.search.slice(1);
  if (!query_string) return args;
  var query_pairs = query_string.split("&");

  var pname, pvalue;

  for (var i = 0; i < query_pairs.length; i++) {
    var equal_position = query_pairs[i].indexOf("=");
    if (equal_position < 0) {
      args[my_uri_decoder(query_pairs[i])] = true;
    } else {
      pname = my_uri_decoder(query_pairs[i].slice(0, equal_position));
      pvalue = my_uri_decoder(query_pairs[i].slice(equal_position + 1));
      // If a name is followed by [], then we'll create an array of
      // values.  This is good for a multiple-select box
      if (pname.indexOf("[]") == pname.length - 2) {
        pname = pname.slice(0, -2);
        if (!args[pname]) args[pname] = new Array();
        args[pname].push(pvalue);
      } else {
        args[pname] = pvalue;
      }
    }
  }

  return args;
}

function my_uri_decoder(v) {
  console.log(v); // TEMP: HERE FOR LOG
  return decodeURIComponent(v.replace(/\+/g, "%20"));
}

// Easily add functions to run at load time
function add_body_onload(func) {
  var old_body_onload = window.onload;
  window.onload = function () {
    if (old_body_onload) {
      old_body_onload();
    }
    func();
  };
}

// Gives us a random permutation.  This is Durstenfeld's
// version of Knuth's shuffle, with in-place swapping.
function random_perm(len) {
  var orig = Array(len);
  for (var x = 0; x < len; x++) {
    orig[x] = x;
  }
  for (var x = len - 1; x > 0; x--) {
    var offset = Math.floor(Math.random() * (x + 1));
    if (offset != x) {
      var tmp = orig[offset];
      orig[offset] = orig[x];
      orig[x] = tmp;
    }
  }
  return orig;
}

// The maze is set on a set of points, some of which connect to
// form walls.  A closed set of walls connects to create a
// cell.  We use object references between cells and walls
// to quickly be able to traverse the maze.  So, a wall has a
// list of both cells to which it connects and a cell has a
// list of all of its walls.
//
// Points have an x,y coordinate that exists to specify their
// position relative to other points.  They also have a set of
// walls that use them as an end point.

function Point(x, y) {
  this.x = x;
  this.y = y;
  this.walls = [];
}

Point.prototype = {
  // Add another point to this one.
  plus: function (other_point) {
    return new Point(this.x + other_point.x, this.y + other_point.y);
  },

  // Subtract another point from this one
  minus: function (other_point) {
    return new Point(this.x - other_point.x, this.y - other_point.y);
  },

  // Divide the point
  divided_by: function (divisor) {
    return new Point(this.x / divisor, this.y / divisor);
  },

  // for generalized code the multiplier might be another
  // point.  Assuming a fixed number here.
  times: function (multiplier) {
    return new Point(this.x * multiplier, this.y * multiplier);
  },

  // Compute distance between points.  Between "distance_to"
  // and "angle_to" we have a set of polar coordinates of
  // "other_point" if "this" is at the origin.
  distance_to: function (other_point) {
    return Math.sqrt(
      Math.pow(other_point.x - this.x, 2) + Math.pow(other_point.y - this.y, 2)
    );
  },

  // From this point, find the angle to another point
  angle_to: function (other_point) {
    return Math.atan2(other_point.y - this.y, other_point.x - this.x);
  },

  // Given a wall, find the next wall in clockwise order
  next_cw_wall: function (this_wall) {
    var wall_at = null;
    for (var j = 0; j < this.walls.length; j++) {
      if (this.walls[j] == this_wall) {
        wall_at = j;
        break;
      }
    }
    if (wall_at !== null) {
      if (wall_at > 0) {
        return this.walls[wall_at - 1];
      } else {
        return this.walls[this.walls.length - 1];
      }
    } else {
      return null;
    }
  },

  // Sorts all walls attached to this point in rotational order
  sort_walls: function () {
    var walls = [];
    for (var j = 0; j < this.walls.length; j++) {
      var wall = this.walls[j];
      walls.push([wall, this.angle_to(wall.other_end(this))]);
    }
    function wall_sorter(a, b) {
      return a[1] - b[1];
    }
    walls.sort(wall_sorter);
    this.walls = [];
    for (var j = 0; j < walls.length; j++) {
      this.walls.push(walls[j][0]);
    }
  },

  // Removes duplicate walls - they should already be sorted.
  // This will remove the wall reference from the other end
  // point, also.
  uniq_walls: function () {
    // assuming there are walls - if none or one return immediately
    if (this.walls.length < 2) return;
    var last_wall_other_end = null;
    for (var j = this.walls.length - 1; j >= 0; j--) {
      var wall = this.walls[j];
      var other_end = wall.other_end(this);
      if (other_end == last_wall_other_end) {
        // This wall is going away - remove from other end
        // point wall list, also
        this.walls.splice(j, 1);
        for (var k = other_end.walls.length - 1; k >= 0; k--) {
          if (other_end.walls[k] === wall) {
            other_end.walls.splice(k, 1);
          }
        }
      } else {
        last_wall_other_end = other_end;
      }
    }
  },

  // Finds all faces attached to a point that aren't yet "found"
  // and returns an array of Cells.  The "signed_area" makes sure
  // that we only find faces that have walls/vertices in
  // clockwise order.  The reason is that the algorithm will find
  // the face from all of the outside walls.  The
  // "safety_counter" can also make it fairly easy to ignore
  // those, but ultimately the only real way to ignore it in all
  // circumstances is to recognize that it'll have a negative
  // "signed_area".
  find_faces: function (max_face_size) {
    var ret_cells = [];
    for (var i = 0; i < this.walls.length; i++) {
      var wall = this.walls[i];
      if (!wall.traversed(this, wall.other_end(this))) {
        var safety_counter = 0;
        var walls = [];
        var this_point = this;
        var other_point;
        var signed_area = 0; // Make sure we're going around clockwise
        do {
          walls.push(wall);
          other_point = wall.other_end(this_point);
          signed_area +=
            this_point.x * other_point.y - other_point.x * this_point.y;
          this_point = wall.traverse(this_point, other_point);
          wall = this_point.next_cw_wall(wall);
          safety_counter++;
        } while (this_point != this && wall);
        if (walls.length <= max_face_size && signed_area > 0 && wall) {
          ret_cells.push(new Cell(walls));
        }
      }
    }
    return ret_cells;
  },

  // returns a string representing the point
  toString: function () {
    return "" + this.x + "," + this.y;
  },

  // remove all walls
  remove_walls: function () {
    this.walls = [];
  },
};

// Walls have a few pieces of information: two end points, the
// state (open (0) or closed (1)), and the two cells that it
// connects.

function Wall(p1, p2) {
  this.points = [p1, p2];
  this.state = 1;
  this.cells = [];
  p1.walls.push(this);
  p2.walls.push(this);
  // These are used for face finding - "down" is "point 0 to
  // point 1", "up" is "point 1 to point 0".
  this.traversed_down = false;
  this.traversed_up = false;
}

Wall.prototype = {
  // Return a point representing the center of this wall
  center: function () {
    return new Point(
      (this.points[0].x + this.points[1].x) / 2,
      (this.points[0].y + this.points[1].y) / 2
    );
  },

  // Returns true if the wall is open
  is_open: function () {
    return this.state == 0;
  },

  // Marks a wall as open, returns "true" if the wall
  // state changes as a result
  open: function () {
    if (this.state == 0) {
      return null;
    } else {
      this.state = 0;
      return true;
    }
  },

  // Marks a wall as closed, returns "true" if the wall
  // state changes as a result
  close: function () {
    if (this.state == 1) {
      return null;
    } else {
      this.state = 1;
      return true;
    }
  },

  // Given a point, returns the "other end" point on the wall.
  other_end: function (point) {
    if (this.points[0] == point) {
      return this.points[1];
    } else if (this.points[1] == point) {
      return this.points[0];
    } else {
      return null;
    }
  },

  // Traverses a wall and marks the direction as traversed.
  traverse: function (point0, point1) {
    if (point0 == this.points[0] && point1 == this.points[1]) {
      this.traversed_down = true;
      return point1;
    } else if (point0 == this.points[1] && point1 == this.points[0]) {
      this.traversed_up = true;
      return point1;
    } else {
      return null;
    }
  },

  // Returns true if wall has already been traversed in given
  // direction.
  traversed: function (point0, point1) {
    if (point0 == this.points[0] && point1 == this.points[1]) {
      return this.traversed_down;
    } else if (point0 == this.points[1] && point1 == this.points[0]) {
      return this.traversed_up;
    } else {
      return null;
    }
  },

  // returns a string representing the wall
  toString: function () {
    return this.points[0].toString() + ":" + this.points[1].toString();
  },

  // Each wall has one or two cells (it's possible that
  // an edge wall may have only one cell).  This will
  // return "undefined" if there is no neighbor, otherwise it
  // will return the neighbor given a reference to one cell.
  neighbor: function (cell) {
    if (this.cells[0] == cell) {
      return this.cells[1];
    } else {
      return this.cells[0];
    }
  },

  // Helper to get the length of a wall
  length: function () {
    return this.points[0].distance_to(this.points[1]);
  },

  // Get the angle of the wall
  angle: function () {
    return this.points[0].angle_to(this.points[1]);
  },
};

// Cells have a set of walls along with a few other pieces of
// information that are used while generating a maze.
// Generally, a permutation of wall directions and a pointer to
// the "current" item in the permutation list.

function Cell(walls) {
  this.walls = walls;
  for (var i = 0; i < this.walls.length; i++) {
    this.walls[i].cells.push(this);
  }
  this.perm = random_perm(this.walls.length);
  this.current_perm = 0;
  this.entry_wall = undefined;
  this.depth = undefined;
  // Used in drunk walk algorithm
  this.serial = undefined;
}

Cell.prototype = {
  // Returns a point representing the exact center of the cell.
  center: function () {
    var x_avg = 0.0;
    for (var i = 0; i < this.walls.length; i++) {
      x_avg += this.walls[i].points[0].x;
      x_avg += this.walls[i].points[1].x;
    }
    x_avg /= this.walls.length * 2;
    var y_avg = 0.0;
    for (var i = 0; i < this.walls.length; i++) {
      y_avg += this.walls[i].points[0].y;
      y_avg += this.walls[i].points[1].y;
    }
    y_avg /= this.walls.length * 2;
    return new Point(x_avg, y_avg);
  },

  // Return a list of all vertices of a cell, in order
  vertices: function () {
    var points = [];
    // I need to pick only a single point from each wall, and it
    // will be the point that isn't in the next wall.
    for (var i = 0; i < this.walls.length; i++) {
      var this_wall = this.walls[i];
      var next_wall = this.walls[i + 1];
      if (!next_wall) {
        next_wall = this.walls[0];
      }
      if (
        this_wall.points[0] != next_wall.points[0] &&
        this_wall.points[0] != next_wall.points[1]
      ) {
        points.push(this_wall.points[0]);
      } else {
        points.push(this_wall.points[1]);
      }
    }
    return points;
  },

  // Return a list of neighboring cells
  neighbors: function () {
    var ret = new Array();
    for (var i = 0; i < this.walls.length; i++) {
      var this_wall = this.walls[i];
      var this_neighbor = this_wall.neighbor(this);
      if (this_neighbor) {
        ret.push(this_neighbor);
      }
    }
    return ret;
  },

  // Return a list of neighboring cells that haven't been visited
  unvisited_neighbors: function () {
    var ret = new Array();
    for (var i = 0; i < this.walls.length; i++) {
      var this_wall = this.walls[i];
      var this_neighbor = this_wall.neighbor(this);
      if (this_neighbor && !this_neighbor.visited()) {
        ret.push(this_neighbor);
      }
    }
    return ret;
  },

  visited: function () {
    for (var i = 0; i < this.walls.length; i++) {
      if (this.walls[i].is_open()) {
        return true;
      }
    }
    return false;
  },
};

// A maze is a collection of cells with a path through them.
// It is two graphs that are interconnected - one which is a
// set of all walls (close and open) and the other a path
// through the open walls.  This data structure holds
// everything of interest about the maze.
function Maze(xsize, ysize, base_style, maze_style) {
  // General data and accessors
  this.points = [];
  this.walls = [];
  this.cells = [];
  this.start_point = null;
  this.end_point = null;
  this.start_wall = null;
  this.end_wall = null;
  this.max_depth = null;
  this.end_depth = null;

  this.base_style = Maze.base_styles_info[base_style];
  if (!this.base_style) {
    throw new Error("Unknown base style: " + base_style);
  }
  this.maze_style = Maze.maze_styles_info[maze_style];
  if (!this.maze_style) {
    throw new Error("Unknown maze style: " + maze_style);
  }

  if (xsize < this.maze_style.min_xsize) {
    throw new Error("Minimum xsize is " + this.maze_style.min_xsize);
  }
  if (ysize < this.maze_style.min_ysize) {
    throw new Error("Minimum ysize is " + this.maze_style.min_ysize);
  }

  this.xsize = xsize * this.base_style.x_multiplier;
  this.ysize = ysize * this.base_style.y_multiplier;

  // Now, we'll initialize the maze.  First, set up the cells
  // according to the "base style".
  this.base_style.algo.call(
    this,
    this.xsize,
    this.ysize,
    this.points,
    this.walls
  );
  this.sort_walls_for_points(this.points);
  // We now have a complete set of points and walls, we need to
  // walk that data structure and determine a set of cells.
  // In graph parlance, points == vertices, walls == edges, and
  // cells == faces.
  // There's a better more efficient way to do this - figure it
  // out later.
  // TODO: figure out a more efficient way to do this
  for (var j = 0; j < this.points.length; j++) {
    var faces = this.points[j].find_faces(this.base_style.max_face_size);
    this.cells = this.cells.concat(faces);
  }
  // At this point, we're ready to actually make a maze.  Get
  // the start and end cells, then generate the maze.
  this.start_wall = this.find_start_wall(this.points);
  this.end_wall = this.find_end_wall(this.points);
  this.maze_style.algo.call(this);
  // Purely for aesthetics, open the corners
  this.open_corners();
  // And set the max depth and end depth, which are useful for
  // rendering.
  this.find_max_depth();
  this.end_depth = this.end_cell().depth;
}

Maze.base_styles = {};
Maze.maze_styles = {};

// To create a maze, we need to move around until we're back to
// the original point.  There's enough information stored in
// each cell to perform this algorithm non-recursively in a
// while loop.
// If performed recursively, this algorithm is simple...
Maze.maze_styles.recursive = function () {
  function recursive_maze(cell, entry_wall, depth) {
    cell.depth = depth;
    cell.entry_wall = entry_wall;
    // Now, go through the surrounding cells and recurse
    for (var k = 0; k < cell.perm.length; k++) {
      var wall_num = cell.perm[k];
      var neighbor = cell.walls[wall_num].neighbor(cell);
      if (neighbor && !neighbor.visited()) {
        cell.walls[wall_num].open();
        arguments.callee(neighbor, cell.walls[wall_num], depth + 1);
      }
    }
  }

  recursive_maze(this.start_cell(), null, 0);
};

// This is Prim's algorithm.  The idea is to start at a random
// location (or at "the starting point", it ultimately won't
// matter) and simply add cells one at a time to the current
// maze in a random order.  Basically, any cell that's touching
// an existing maze cell is fair game for attaching to the
// maze.
// The "official" way of doing this is to separate the maze
// into three cell types: "in", "out", and "frontier".  "in"
// cells are part of the maze, "frontier" cells are those which
// are next to an "in" cell, and "out" are all others.  On each
// cycle a frontier cell is chosen at random, attached to the
// maze, and removed from the list of frontier cells.  All of
// its neighbors which are "out" then become frontier cells and
// the cycle is repeated.  It stops when there are no more
// frontier cells.
//
// There's no need for recursion.
Maze.maze_styles.prim = function () {
  var frontier_cells = new Array();

  // Doing this officially, start at a random location
  var start = this.cells[Math.floor(Math.random() * this.cells.length)];
  //var start = this.start_cell();

  frontier_cells = start.unvisited_neighbors();

  while (frontier_cells.length > 0) {
    var next_cell =
      frontier_cells[Math.floor(Math.random() * frontier_cells.length)];
    // My reading of Prim's algorithm is that we always
    // connect back to the first cell for which this was a
    // frontier.  Oh well.  I'd rather just make it random.
    var visited_neighbor_walls = new Array();
    var unvisited_neighbors = new Array();
    for (var i = 0; i < next_cell.walls.length; i++) {
      var this_wall = next_cell.walls[i];
      var this_neighbor = this_wall.neighbor(next_cell);
      if (this_neighbor) {
        if (this_neighbor.visited()) {
          visited_neighbor_walls.push(this_wall);
        } else {
          unvisited_neighbors.push(this_neighbor);
        }
      }
    }
    // now, we have a list of visited neighbors and a list of
    // unvisited neighbors.  Unvisited neighbors get added to
    // the frontier list while one of the visited neighbors
    // will be the lucky neighbor to which we'll connect.
    if (visited_neighbor_walls.length) {
      var connect_to_num = Math.floor(
        Math.random() * visited_neighbor_walls.length
      );
      var connect_to_wall = visited_neighbor_walls[connect_to_num];
    } else {
      // There are no visited neighbors, which will only occur
      // when we're at the start.
      for (
        var connect_to_num = 0;
        connect_to_num < next_cell.walls.length;
        connect_to_num++
      ) {
        if (next_cell.walls[connect_to_num].neighbor(next_cell) == start) {
          var connect_to_wall = next_cell.walls[connect_to_num];
          break;
        }
      }
    }

    connect_to_wall.open();

    // Remove this cell from the frontier list
    for (var i = 0; i < frontier_cells.length; i++) {
      if (frontier_cells[i] == next_cell) {
        frontier_cells.splice(i, 1);
        break;
      }
    }

    // And add all unvisited neighbors to the frontier list
    // (if they're not already there)
    for (var i = 0; i < unvisited_neighbors.length; i++) {
      var found = false;
      for (var j = 0; j < frontier_cells.length; j++) {
        if (frontier_cells[j] == unvisited_neighbors[i]) {
          found = true;
          break;
        }
      }
      if (!found) {
        frontier_cells.push(unvisited_neighbors[i]);
      }
    }
  }

  // This needs to have depth calculated independently
  this.find_depth(this.start_cell(), null, 0);
};

// Like Prim's algorithm, but each "frontier" cell adds a path
// each cycle.  In this case, a frontier cell is one in which
// there are neighbors that aren't yet part of the maze.  When
// a cell has no more unvisited neighbors, it drops out of the
// frontier list.
Maze.maze_styles.bacterial = function () {
  var frontier_cells = new Array();

  // Doing this officially, start at a random location
  var start = this.cells[Math.floor(Math.random() * this.cells.length)];
  //var start = this.start_cell();

  frontier_cells = [start];

  while (frontier_cells.length > 0) {
    var to_be_removed = new Array();

    var current_frontier_length = frontier_cells.length;
    var my_order = random_perm(current_frontier_length);

    for (var k = 0; k < current_frontier_length; k++) {
      var next_cell = frontier_cells[my_order[k]];

      var unvisited_neighbor_walls = new Array();

      for (var i = 0; i < next_cell.walls.length; i++) {
        var this_wall = next_cell.walls[i];
        var this_neighbor = this_wall.neighbor(next_cell);
        if (this_neighbor && !this_neighbor.visited()) {
          unvisited_neighbor_walls.push([this_neighbor, this_wall]);
        }
      }

      if (unvisited_neighbor_walls.length == 0) {
        to_be_removed.push(my_order[k]);
      } else {
        // Choose one at random and move to it, and add it
        // to the frontier list.
        var item =
          unvisited_neighbor_walls[
            Math.floor(Math.random() * unvisited_neighbor_walls.length)
          ];
        var this_neighbor = item[0];
        var this_wall = item[1];
        this_wall.open();
        frontier_cells.push(this_neighbor);
      }
    }

    var remove_num;

    to_be_removed.sort(function (a, b) {
      return a - b;
    });

    // Remove frontier cells that have no unvisited neighbors
    while (to_be_removed.length > 0) {
      var remove_num = to_be_removed.pop();
      frontier_cells.splice(remove_num, 1);
    }
  }

  // This needs to have depth calculated independently
  this.find_depth(this.start_cell(), null, 0);
};

// My unicursal algorithm doesn't work well yet.  It sometimes
// works.
//
// Odd way to make a maze - this is really a space filling
// curve.  The idea of this is to have one long path from
// start to finish with no dead ends.  The way to do this
// (or at least the way I'll do it) is that each time the maze
// touches a side or an existing path we have to check to make
// sure we didn't cut off any cells.  If we did, we backtrack
// by one cell, closing the entry wall.  In that case, after
// backtracking we need to next move to cell that will move us
// into the area that isn't filled - a wall between the
// original entry wall and the exit wall.  If there is none we
// need to backtrack again until we can find one.
Maze.maze_styles.unicursal_better_but_nonfunctional = function () {
  var end_cell = this.end_cell();

  function check_neighbor(cell, entry_wall) {
    if (!cell || cell == end_cell) {
      return false;
    } else {
      var map = new Array(cell.walls.length);
      cell.walls.forEach(function (wall, index, arr) {
        var neighbor = wall.neighbor(cell);
        map[index] = !neighbor || neighbor.visited() ? "v" : "u";
      });
      if (
        map.filter(function (x) {
          return x == "u";
        }).length < 2
      ) {
        // This one only has a single way out
        return true;
      } else {
        return false;
      }
    }
  }

  function recursive_maze(cell, entry_wall, depth) {
    cell.depth = depth;
    cell.entry_wall = entry_wall;
    // Let's see if we're touching a cell that is either
    // on the outside or is already part of the path,
    // ignoring the cell from whence we came.
    var pattern = new Array(cell.perm.length);
    var must_visit = new Array(cell.perm.length);
    for (var k = 0; k < cell.walls.length; k++) {
      var neighbor = cell.walls[k].neighbor(cell);
      pattern[k] = !neighbor || neighbor.visited() ? "v" : "u";
      must_visit[k] = check_neighbor(neighbor, cell.walls[k]);
    }
    var must_visit_count = must_visit.filter(function (x) {
      return x;
    }).length;
    if (must_visit_count > 1) {
      // More than one "must visit cell", must backtrack
      return true;
    } else if (must_visit_count == 1) {
      // Must visit this cell
      var wall_num = must_visit.indexOf(true);
      var neighbor = cell.walls[wall_num].neighbor(cell);
      cell.walls[wall_num].open();
      var backtrack = arguments.callee(
        neighbor,
        cell.walls[wall_num],
        depth + 1
      );
      if (backtrack) {
        cell.walls[wall_num].close();
        return false;
      }
    } else if (pattern.join("").match(/(v+|u+)/g).length >= 4) {
      // We're touching an outside wall or another
      // part of the path, make sure we didn't just
      // cut off some cells.  If we did cut off some
      // cells, there will be a closed path of walls
      // around the cells.  If that closed path
      // includes the "exit cell", it should be
      // ignored.  If it doesn't include the exit
      // cell, it'll be enclosed and we'll backtrack.
      // There is likely a way to determine this based
      // on whether the path is clockwise or CCW
      // depending on the relationship between the
      // current cell and the touched cell/wall, but
      // I'll figure that out later.
      //
      // A little later: This might not completely solve
      // it, but if we run into another wall we can
      // determine if this block cuts a space into two
      // pieces.  This is a dirt simple computation -
      // between the current wall and the entry wall
      // there should be closed walls with unvisited
      // neighbor cells on each side.  The only
      // difference is if we're at the end cell, in
      // which case any unvisited neighbor cells will
      // cause a backtrack.
      //
      // More simply stated, if we start at 0 and go
      // through all the walls on the current cell,
      // we may find alternating sections of visited
      // cell/outer wall, unvisited cell, visited
      // cell/outer wall, unvisited cell.  If we find
      // that pattern, we backtrack.
      //
      // Okay, more.  From the current cell, we need to
      // determine which cell to visit next.  Any other
      // neighboring unvisited cells should have at least
      // two walls that are on unvisited cells, and those
      // two walls should share one end point.  So if the
      // current square causes any of its neighbors to have
      // only one openable wall we need to backtrack.
      return true;
    }
    // If it's the last cell, we backtrack if there
    // are any unvisited cells around it.
    if (cell == end_cell) {
      if (pattern.indexOf("u") > -1) {
        return true;
      }
    } else {
      // If it's not the last cell and it's a dead end, then
      // we backtrack
      if (pattern.join("").match(/^v+$/)) {
        return true;
      }
    }

    var backtracked = false;
    var visited_elsewhere = false;

    // Now, go through the surrounding cells and recurse
    var possible_walls = [];
    for (var k = 0; k < cell.perm.length; k++) {
      var wall_num = cell.perm[k];
      if (pattern[wall_num] == "u") {
        var neighbor = cell.walls[wall_num].neighbor(cell);
        cell.walls[wall_num].open();
        var backtrack = arguments.callee(
          neighbor,
          cell.walls[wall_num],
          depth + 1
        );
        if (backtrack) {
          cell.walls[wall_num].close();
          backtracked = true;
        } else {
          visited_elsewhere = true;
        }
      }
    }

    if (!visited_elsewhere && backtracked) {
      return true;
    } else {
      // Don't backtrack
      return false;
    }
  }

  recursive_maze(this.start_cell(), null, 0);
};

// Really inefficient unicursal algorithm.  This is a standard
// recursive backtracker with a slight modification.  If we're
// at the last cell and there are no unvisited cells then we
// return "true".  If the recursion returns true then we return
// true.  If it's false then we try the next wall, and return
// false if all return false.
//
// Without offering a proof I believe that the time this takes
// to generate a random path grows exponentially with the maze
// size.  Just doing simple tests, I can get it to work easily
// on a 7x5 square maze (at least one dimension has to be odd
// for a square maze), 9x6 works sometimes,  but 11x7
// essentially locks up.
Maze.maze_styles.unicursal = function () {
  var end_cell = this.end_cell();
  var max_depth = this.cells.length - 1;

  function recursive_maze(cell, entry_wall, depth) {
    cell.depth = depth;
    cell.entry_wall = entry_wall;

    // Check if this is the end (yes, I'm aware of the
    // optimization).
    if (cell == end_cell) {
      if (depth == max_depth) {
        return true;
      } else {
        return false;
      }
    }

    // Now, go through the surrounding cells and recurse
    for (var k = 0; k < cell.perm.length; k++) {
      var wall_num = cell.perm[k];
      var neighbor = cell.walls[wall_num].neighbor(cell);
      if (neighbor && !neighbor.visited()) {
        cell.walls[wall_num].open();
        var winner = arguments.callee(
          neighbor,
          cell.walls[wall_num],
          depth + 1
        );
        if (winner) return true;
        cell.walls[wall_num].close();
      }
    }

    return false;
  }

  var success = recursive_maze(this.start_cell(), null, 0);
  if (!success) {
    throw "Cannot create unicursal maze with these parameters.";
  }
};

// Create a maze using the drunk walk algorithm.  In this
// algorithm, we create random segments that grow like the
// recursive algorithm above until they connect to another
// existing segment.  Each cell has a "serial" number that
// specifies which segment it belongs to, so as a segment grows
// it can see if it's touching "self" or "other".  It will
// connect to "other" and quit growing.
Maze.maze_styles.drunk_walk = function () {
  function drunk_walk(cell, entry_wall, serial, depth) {
    pieces_left--;
    cell.serial = serial;
    if (depth == 0) return false;
    for (var k = 0; k < cell.perm.length; k++) {
      var wall_num = cell.perm[k];
      var wall = cell.walls[wall_num];
      if (wall != entry_wall && !wall.is_open()) {
        var neighbor = wall.neighbor(cell);
        if (neighbor) {
          if (!neighbor.serial) {
            wall.open();
            var ret = arguments.callee(neighbor, wall, serial, depth - 1);
            if (!ret) return false;
          } else if (neighbor.serial != serial) {
            wall.open();
            return false;
          }
        }
      }
    }
    return true;
  }

  // Note that this is a scoped variable - the "drunk_walk"
  // function refers to it.
  var pieces_left = this.cells.length;

  // Note that this is declared here but the drunk_walk
  // function has "serial" as an argument, also.
  var serial = 1;

  // Grow an initial segment starting at a random location.
  // The length of the segment is up to 1/10th of the
  // available cells + 5.
  drunk_walk(
    this.cells[Math.floor(Math.random() * pieces_left)],
    null,
    serial++,
    Math.floor((Math.random() * pieces_left) / 10) + 5
  );

  // Now, keep growing segments until we run out of pieces
  while (pieces_left > 0) {
    var next_start = Math.floor(Math.random() * pieces_left) + 1;
    var empty_found = 0,
      i;
    for (i = 0; i < this.cells.length; i++) {
      if (!this.cells[i].serial) {
        empty_found++;
        if (empty_found >= next_start) {
          drunk_walk(this.cells[i], null, serial++, 99999999);
          break;
        }
      }
    }
  }

  this.find_depth(this.start_cell(), null, 0);
};

// Recursively finds the depths of all cells given a starting
// point.  Make sure to do this before opening the start and
// end.  This will also point all "entry walls" to the
// beginning.
Maze.prototype.find_depth = function (cell, entry_wall, depth) {
  cell.depth = depth;
  cell.entry_wall = entry_wall;
  for (var k = 0; k < cell.walls.length; k++) {
    if (cell.walls[k] != entry_wall && cell.walls[k].is_open()) {
      arguments.callee(cell.walls[k].neighbor(cell), cell.walls[k], depth + 1);
    }
  }
};

Maze.prototype.find_max_depth = function () {
  this.max_depth = 0;
  for (var i = 0; i < this.cells.length; i++) {
    if (this.cells[i].depth > this.max_depth) {
      this.max_depth = this.cells[i].depth;
    }
  }
  return this.max_depth;
};

Maze.prototype.start_cell = function () {
  return this.start_wall.cells[0];
};

Maze.prototype.end_cell = function () {
  return this.end_wall.cells[0];
};

// This will create a simple square maze
Maze.base_styles.square = function (xsize, ysize, all_points, all_walls) {
  // points_tracker[x][y] = point - this exists only as a tool to
  // keep track of points for wall building.
  var points_tracker = Array(xsize + 1);

  for (var x = 0; x <= xsize; x++) {
    points_tracker[x] = Array(ysize + 1);
    for (var y = 0; y <= ysize; y++) {
      points_tracker[x][y] = new Point(x, y);
      all_points.push(points_tracker[x][y]);
      // Build vertical walls
      if (y > 0) {
        all_walls.push(
          new Wall(points_tracker[x][y - 1], points_tracker[x][y])
        );
      }
      // Build horizontal walls
      if (x > 0) {
        all_walls.push(
          new Wall(points_tracker[x - 1][y], points_tracker[x][y])
        );
      }
    }
  }

  // Last, set the start and end points
  this.start_point = points_tracker[0][0];
  this.end_point = points_tracker[xsize][ysize];
};

// Triangle maze - on odd rows the points are in odd columns,
// in even rows the points are in even columns.
Maze.base_styles.triangle = function (xsize, ysize, all_points, all_walls) {
  // points_tracker[x][y] = point - this exists only as a tool to
  // keep track of points for wall building.
  var points_tracker = Array(xsize + 1);

  // First, make the points - even lines/cols
  for (var x = 0; x < xsize + 1; x += 2) {
    points_tracker[x] = Array(ysize + 1);
    for (var y = 0; y < ysize + 1; y += 2) {
      points_tracker[x][y] = new Point(x, y);
      all_points.push(points_tracker[x][y]);
      // Build horizontal walls
      if (x > 0) {
        all_walls.push(
          new Wall(points_tracker[x - 2][y], points_tracker[x][y])
        );
      }
    }
  }

  // Next, make the points - odd lines/cols
  for (var x = 1; x < xsize + 1; x += 2) {
    points_tracker[x] = Array(ysize + 1);
    for (var y = 1; y < ysize + 1; y += 2) {
      points_tracker[x][y] = new Point(x, y);
      all_points.push(points_tracker[x][y]);
      // Build horizontal walls
      if (x > 1) {
        all_walls.push(
          new Wall(points_tracker[x - 2][y], points_tracker[x][y])
        );
      }
    }
  }

  // Now, make walls from even cols to odd cols
  for (var x = 0; x < xsize; x += 2) {
    for (var y = 0; y < ysize; y += 2) {
      if (points_tracker[x + 1]) {
        if (points_tracker[x + 1][y + 1]) {
          all_walls.push(
            new Wall(points_tracker[x][y], points_tracker[x + 1][y + 1])
          );
        }
        if (points_tracker[x][y + 2]) {
          all_walls.push(
            new Wall(points_tracker[x + 1][y + 1], points_tracker[x][y + 2])
          );
        }
      }
      if (points_tracker[x + 2]) {
        if (points_tracker[x + 1][y + 1]) {
          all_walls.push(
            new Wall(points_tracker[x + 2][y], points_tracker[x + 1][y + 1])
          );
        }
        if (points_tracker[x + 2][y + 2]) {
          all_walls.push(
            new Wall(points_tracker[x + 1][y + 1], points_tracker[x + 2][y + 2])
          );
        }
      }
    }
  }

  // Last, set the start and end points
  this.start_point = points_tracker[0][0];
  for (var x = xsize; x > 0; x--) {
    this.end_point = points_tracker[x][ysize];
    if (this.end_point) {
      break;
    }
  }
};

// Hexagonal maze
Maze.base_styles.hexagonal = function (xsize, ysize, all_points, all_walls) {
  // Might have to adjust xsize - it should be 4+6*(k-1) wide,
  // where k is the original xsize
  this.xsize = 4 + 6 * (xsize - 1);
  this.ysize = 2 * ysize;

  xsize = this.xsize;
  ysize = this.ysize;

  // points_tracker[y][x] = point - this exists only as a tool to
  // keep track of points for wall building.
  var points_tracker = Array(ysize + 1);

  // First, make the points - even lines
  for (var y = 0; y < ysize + 1; y += 2) {
    points_tracker[y] = Array(xsize + 1);
    for (var x = 1; x < xsize + 1; x += 6) {
      points_tracker[y][x] = new Point(x, y);
      all_points.push(points_tracker[y][x]);
      points_tracker[y][x + 2] = new Point(x + 2, y);
      all_points.push(points_tracker[y][x]);
      // Build horizontal walls
      all_walls.push(new Wall(points_tracker[y][x], points_tracker[y][x + 2]));
    }
  }

  // Next, make the points - odd lines
  for (var y = 1; y < ysize + 1; y += 2) {
    points_tracker[y] = Array(ysize + 1);
    // First, put a lone point at 0,0
    points_tracker[y][0] = new Point(0, y);
    all_points.push(points_tracker[y][0]);
    // And another lone point at the end of the line
    points_tracker[y][xsize] = new Point(xsize, y);
    all_points.push(points_tracker[y][xsize]);
    for (var x = 4; x < xsize; x += 6) {
      points_tracker[y][x] = new Point(x, y);
      all_points.push(points_tracker[y][x]);
      points_tracker[y][x + 2] = new Point(x + 2, y);
      all_points.push(points_tracker[y][x]);
      // Build horizontal walls
      all_walls.push(new Wall(points_tracker[y][x], points_tracker[y][x + 2]));
    }
  }

  for (var y = 0; y < ysize; y += 2) {
    for (var x = 1; x < xsize; x += 6) {
      all_walls.push(
        new Wall(points_tracker[y][x], points_tracker[y + 1][x - 1])
      );
      all_walls.push(
        new Wall(points_tracker[y + 1][x - 1], points_tracker[y + 2][x])
      );
      all_walls.push(
        new Wall(points_tracker[y][x + 2], points_tracker[y + 1][x + 3])
      );
      all_walls.push(
        new Wall(points_tracker[y + 1][x + 3], points_tracker[y + 2][x + 2])
      );
    }
  }

  // Last, set the start and end points
  this.start_point = points_tracker[0][1];
  this.end_point = points_tracker[ysize][xsize - 1];
};

// Diamond maze
Maze.base_styles.diamond = function (xsize, ysize, all_points, all_walls) {
  // points_tracker[x][y] = point - this exists only as a tool to
  // keep track of points for wall building.
  var points_tracker = Array(xsize + 1);

  // First, make the points - even lines/odd cols
  for (var x = 0; x < xsize + 1; x += 2) {
    points_tracker[x] = Array(ysize + 1);
    for (var y = 1; y < ysize + 1; y += 2) {
      points_tracker[x][y] = new Point(x, y);
      all_points.push(points_tracker[x][y]);
    }
  }

  // Next, make the points - odd lines/even cols
  for (var x = 1; x < xsize + 1; x += 2) {
    points_tracker[x] = Array(ysize + 1);
    for (var y = 0; y < ysize + 1; y += 2) {
      points_tracker[x][y] = new Point(x, y);
      all_points.push(points_tracker[x][y]);
    }
  }

  for (var x = 1; x < xsize; x += 2) {
    for (var y = 0; y < ysize; y += 2) {
      all_walls.push(
        new Wall(points_tracker[x][y], points_tracker[x - 1][y + 1])
      );
      all_walls.push(
        new Wall(points_tracker[x][y], points_tracker[x + 1][y + 1])
      );
      all_walls.push(
        new Wall(points_tracker[x - 1][y + 1], points_tracker[x][y + 2])
      );
      all_walls.push(
        new Wall(points_tracker[x + 1][y + 1], points_tracker[x][y + 2])
      );
    }
  }

  // Last, set the start and end points
  this.start_point = points_tracker[1][0];
  this.end_point = points_tracker[xsize - 1][ysize];
};

// This will create a square/triangle maze - each square is
// made of four triangles.
Maze.base_styles.squaretriangles = function (
  xsize,
  ysize,
  all_points,
  all_walls
) {
  // points_tracker[x][y] = point - this exists only as a tool to
  // keep track of points for wall building.
  var points_tracker = Array(xsize + 1);

  for (var x = 0; x <= xsize; x += 2) {
    points_tracker[x] = Array(ysize + 1);
    if (x > 0) {
      points_tracker[x - 1] = Array(ysize + 1);
    }
    for (var y = 0; y <= ysize; y += 2) {
      points_tracker[x][y] = new Point(x, y);
      all_points.push(points_tracker[x][y]);
      // Build vertical walls
      if (y > 0) {
        all_walls.push(
          new Wall(points_tracker[x][y - 2], points_tracker[x][y])
        );
      }
      // Build horizontal walls
      if (x > 0) {
        all_walls.push(
          new Wall(points_tracker[x - 2][y], points_tracker[x][y])
        );
        // Build diagonal walls
        if (y > 0) {
          points_tracker[x - 1][y - 1] = new Point(x - 1, y - 1);
          all_points.push(points_tracker[x - 1][y - 1]);
          all_walls.push(
            new Wall(points_tracker[x - 1][y - 1], points_tracker[x - 2][y - 2])
          );
          all_walls.push(
            new Wall(points_tracker[x - 1][y - 1], points_tracker[x - 2][y])
          );
          all_walls.push(
            new Wall(points_tracker[x - 1][y - 1], points_tracker[x][y - 2])
          );
          all_walls.push(
            new Wall(points_tracker[x - 1][y - 1], points_tracker[x][y])
          );
        }
      }
    }
  }

  // Last, set the start and end points
  this.start_point = points_tracker[0][0];
  this.end_point = points_tracker[xsize][ysize];
};

// This will create a snub square tiling, with squares at each
// corner.  I totally cheat, of course.  What I make is a
// set of perfect squares with every other square being cut
// into two right triangles, the direction depending on whether
// the row is odd or even.  I can then rotate the squares ever
// so slightly just right to make the triangles equilateral.
// Basically, we can think of the straight squares (starting in
// corners and then every other square) as being rotated CCW by
// 15 degrees.  This can be simplified to a set of x,y offsets
// depending on the location of the point, basically whether x
// and y are odd or even.  Furthermore, since it's a perfect
// square the offsets need only be computed one time and
// applied properly to each corner.
Maze.base_styles.snubsquare = function (xsize, ysize, all_points, all_walls) {
  // Need to make sure xsize and ysize are odd
  this.xsize = this.xsize | 1;
  this.ysize = this.ysize | 1;

  xsize = this.xsize;
  ysize = this.ysize;

  // Offsets
  var upper_right_x_offset =
    Math.cos((60.0 * Math.PI) / 180.0) - Math.cos((45.0 * Math.PI) / 180.0);
  var upper_right_y_offset =
    Math.sin((60.0 * Math.PI) / 180.0) - Math.sin((45.0 * Math.PI) / 180.0);
  upper_right_x_offset /= Math.sqrt(2);
  upper_right_y_offset /= Math.sqrt(2);

  // offsets[x][y] where "x" and "y" are 0 or 1
  var offsets = [
    [
      { x: -upper_right_x_offset, y: -upper_right_y_offset }, // 0,0
      { x: -upper_right_y_offset, y: upper_right_x_offset }, // 0,1
    ],
    [
      { x: upper_right_y_offset, y: -upper_right_x_offset }, // 1,0
      { x: upper_right_x_offset, y: upper_right_y_offset }, // 1,1
    ],
  ];

  // Each square has to be moved toward the origin by twice this
  // value for each square.  It's easy to work the math out.
  // My method is a little ghetto, but I don't care.  It works
  // and it's easy to understand.
  var scale_offset = 1.0 - Math.cos((15.0 * Math.PI) / 180.0);

  // points_tracker[x][y] = point - this exists only as a tool to
  // keep track of points for wall building.
  var points_tracker = Array(xsize + 1);

  for (var x = 0; x <= xsize; x++) {
    points_tracker[x] = Array(ysize + 1);
    for (var y = 0; y <= ysize; y++) {
      points_tracker[x][y] = new Point(
        x - 2 * Math.floor(x / 2.0) * scale_offset + offsets[x & 1][y & 1].x,
        y - 2 * Math.floor(y / 2.0) * scale_offset + offsets[x & 1][y & 1].y
      );
      all_points.push(points_tracker[x][y]);
      // Build vertical walls
      if (y > 0) {
        all_walls.push(
          new Wall(points_tracker[x][y - 1], points_tracker[x][y])
        );
      }
      // Build horizontal walls
      if (x > 0) {
        all_walls.push(
          new Wall(points_tracker[x - 1][y], points_tracker[x][y])
        );
      }
      // Now, build diagonal walls where proper.  On even columns
      // and odd rows, build a diagonal down to the left
      if (x > 0 && !(x & 1) && y & 1) {
        all_walls.push(
          new Wall(points_tracker[x][y], points_tracker[x - 1][y - 1])
        );
      }
      // On odd columns and even rows, build a diagonal up
      // to the left
      if (x & 1 && !(y & 1) && y > 0) {
        all_walls.push(
          new Wall(points_tracker[x][y - 1], points_tracker[x - 1][y])
        );
      }
    }
  }

  // Last, set the start and end points
  this.start_point = points_tracker[0][0];
  this.end_point = points_tracker[xsize][ysize];

  // Reset xsize and ysize to reflect actual size of maze
  this.xsize = points_tracker[xsize][ysize].x;
  this.ysize = points_tracker[xsize][ysize].y;
};

// Snub square tiling set at 45 degrees from the other way of doing it.
Maze.base_styles.snubsquare2 = function (xsize, ysize, all_points, all_walls) {
  // Ensure that xsize and ysize are even - go up to next number
  // if odd.
  xsize = ((xsize + 1) | 1) - 1;
  ysize = ((ysize + 1) | 1) - 1;

  this.xsize = xsize;
  this.ysize = ysize;

  // Setting the recurring pattern on a 7x7 grid
  xarraysize = (xsize * 6) / 2 + 1;
  yarraysize = (ysize * 6) / 2 + 1;

  // Offsets
  var offsets = [
    0,
    0.5,
    Math.cos((30.0 * Math.PI) / 180.0),
    Math.cos((30.0 * Math.PI) / 180.0) + 0.5,
    Math.cos((30.0 * Math.PI) / 180.0) + 1.0,
    2 * Math.cos((30.0 * Math.PI) / 180.0) + 0.5,
    2 * Math.cos((30.0 * Math.PI) / 180.0) + 1,
  ];

  var every_2_offset = offsets[6];

  // points_tracker[x][y] = point - this exists only as a tool to
  // keep track of points for wall building.
  var points_tracker = Array(xarraysize + 1);

  for (var x = 0; x <= xsize * 3; x += 6) {
    for (var j = 0; j < 6; j++) {
      points_tracker[x + j] = Array(yarraysize + 1);
    }
    for (var y = 0; y <= ysize * 3; y += 6) {
      if (y > 0) {
        points_tracker[x][y - 5] = new Point(x, y - 5);
        all_points.push(points_tracker[x][y - 5]);
        points_tracker[x][y - 1] = new Point(x, y - 1);
        all_points.push(points_tracker[x][y - 1]);
        if (y > 6) {
          all_walls.push(
            new Wall(points_tracker[x][y - 5], points_tracker[x][y - 7])
          );
        }
      }
      if (x > 0) {
        points_tracker[x - 4][y] = new Point(x - 4, y);
        all_points.push(points_tracker[x - 4][y]);
        points_tracker[x - 2][y] = new Point(x - 2, y);
        all_points.push(points_tracker[x - 2][y]);
        all_walls.push(
          new Wall(points_tracker[x - 4][y], points_tracker[x - 2][y])
        );
        if (y > 0) {
          points_tracker[x - 3][y - 2] = new Point(x - 3, y - 2);
          all_points.push(points_tracker[x - 3][y - 2]);
          points_tracker[x - 3][y - 4] = new Point(x - 3, y - 4);
          all_points.push(points_tracker[x - 3][y - 4]);
          points_tracker[x - 1][y - 3] = new Point(x - 1, y - 3);
          all_points.push(points_tracker[x - 1][y - 3]);
          points_tracker[x - 5][y - 3] = new Point(x - 5, y - 3);
          all_points.push(points_tracker[x - 5][y - 3]);
          // build the walls
          all_walls.push(
            new Wall(points_tracker[x][y - 1], points_tracker[x - 2][y])
          );
          all_walls.push(
            new Wall(points_tracker[x][y - 1], points_tracker[x - 1][y - 3])
          );
          all_walls.push(
            new Wall(points_tracker[x][y - 5], points_tracker[x - 1][y - 3])
          );
          all_walls.push(
            new Wall(points_tracker[x][y - 5], points_tracker[x - 2][y - 6])
          );

          all_walls.push(
            new Wall(points_tracker[x - 6][y - 1], points_tracker[x - 4][y])
          );
          all_walls.push(
            new Wall(points_tracker[x - 6][y - 1], points_tracker[x - 5][y - 3])
          );
          all_walls.push(
            new Wall(points_tracker[x - 6][y - 5], points_tracker[x - 5][y - 3])
          );
          all_walls.push(
            new Wall(points_tracker[x - 6][y - 5], points_tracker[x - 4][y - 6])
          );

          all_walls.push(
            new Wall(points_tracker[x - 3][y - 2], points_tracker[x - 2][y])
          );
          all_walls.push(
            new Wall(points_tracker[x - 3][y - 2], points_tracker[x - 1][y - 3])
          );
          all_walls.push(
            new Wall(points_tracker[x - 3][y - 2], points_tracker[x - 3][y - 4])
          );
          all_walls.push(
            new Wall(points_tracker[x - 3][y - 2], points_tracker[x - 5][y - 3])
          );
          all_walls.push(
            new Wall(points_tracker[x - 3][y - 2], points_tracker[x - 4][y])
          );

          all_walls.push(
            new Wall(points_tracker[x - 3][y - 4], points_tracker[x - 1][y - 3])
          );
          all_walls.push(
            new Wall(points_tracker[x - 3][y - 4], points_tracker[x - 2][y - 6])
          );
          all_walls.push(
            new Wall(points_tracker[x - 3][y - 4], points_tracker[x - 4][y - 6])
          );
          all_walls.push(
            new Wall(points_tracker[x - 3][y - 4], points_tracker[x - 5][y - 3])
          );

          if (x > 6) {
            all_walls.push(
              new Wall(
                points_tracker[x - 5][y - 3],
                points_tracker[x - 7][y - 3]
              )
            );
          }
        }
      }
    }
  }

  // Set offset for all points
  for (var j = 0; j < all_points.length; j++) {
    var p = all_points[j];
    var old_x = p.x;
    var old_y = p.y;
    p.x = Math.floor(old_x / 6) * every_2_offset + offsets[old_x % 6];
    p.y = Math.floor(old_y / 6) * every_2_offset + offsets[old_y % 6];
  }

  // Last, set the start and end points
  this.start_point = points_tracker[0][1];
  this.end_point = points_tracker[xsize * 3][ysize * 3 - 1];

  // Reset xsize and ysize to reflect actual size of maze
  this.xsize = points_tracker[xsize * 3][ysize * 3 - 1].x;
  this.ysize = points_tracker[xsize * 3 - 2][ysize * 3].y;
};

// Cairo tiling is based on a series of pentagons in groups of
// four.  Each pentagon has 4 walls of equal length and a
// single shorter wall.  We can create a snub square tiling
// pattern first that consists of 5 squares and 8 triangles
// (although we technically need only 2 squares and 3
// triangles).  The centers of each square and triangle then
// become the vertices of the pentagons in a single repeated
// pattern.  The pattern is rotationally symmetric around the
// center of the center square, so we can compute only one
// single pentagon and rotate it through to get the rest of the
// coordinates.
//
// But the pattern can actually be computed in a simpler
// manner.  Each pentagon has two 90 degree angles.  The center
// square is rotated 15 degrees CW, and the opposite 90 degree
// angles are rotated 15 degrees CCW.  The angle where the two
// equilateral sides meet is then 120 degrees.  Thus, the other
// angles are also 120 degrees.
//
// Going back to the snub square method, we can easily see that
// the "long" walls are made of two segments - one is half the
// length of the square's walls (which are a single unit) and
// the other is the distance from the perpendicular in the
// middle of an equilateral triangle's side (also a single
// unit) to the center.  The "short" walls are then twice the
// distance from the center of the triangle.
//
// Working out the math, the length of the long wall is
// .5 + .5 x tan(30)
// and the length of the short wall is
// 2 x .5 x tan(30)	- which is just tan(30)
//
// So we can think of each group of 4 in a pattern where the
// center has 4 long lines connecting at 90 degree angles.  The
// other end of each line is a point which connects to a long
// line on the CW side at a 120 degree angle and to a short
// line on the CCW side at a 120 degree angle.  Continuing CW
// we have another long line, this time at a 90 degree angle,
// and then we're to the short line at a 120 degree angle
// (at which point we've completed the shape).  Now, we need to
// take that entire structure and rotate it 15 degrees CW.  We
// can tile a plane with this shape.
//
// So, we'll compute the as a center point and 3 "offsets"
// from there.

Maze.base_styles.cairo = function (xsize, ysize, all_points, all_walls) {
  // Need to make sure xsize and ysize are even
  this.xsize = this.xsize & 1 ? this.xsize + 1 : this.xsize;
  this.ysize = this.ysize & 1 ? this.ysize + 1 : this.ysize;

  // There are 3 x positions for every 2 cells
  xsize = this.xsize * 1.5;
  ysize = this.ysize;

  var long_line_length = 0.5 + Math.tan((30.0 * Math.PI) / 180.0) / 2.0;
  var short_line_length = Math.tan((30.0 * Math.PI) / 180.0);
  // Offsets - assuming "center" is 0,0 - we compute three
  // other points.
  var p1 = new Point(
    Math.sin((15.0 * Math.PI) / 180.0) * long_line_length,
    Math.cos((15.0 * Math.PI) / 180.0) * long_line_length
  );
  // Same offsets - just x and y reversed
  var p2 = new Point(p1.x + p1.y, p1.y + p1.x);
  // Same offset values as first time, but y is subtracted
  var p3 = new Point(p2.x + p1.x, p2.y - p1.y);
  var center_offset = new Point(p3.x, p3.x);

  // In order to fit in a structure with a (0,0) origin, we
  // need to offset the entire thing such that the vertex on
  // the CCW side of the short line is "0" - one for "x" and
  // one for "y".  It's the same distance from the center,
  // though - and it's the "x" offset of p3.  In the same way,
  // the width and height of one group of 4 is p1.y + p3.x.
  // Divided by 2, that number is the multiplier from the snub
  // square layout - cos(15).

  // Each square has to be moved toward the origin by twice this
  // value for each square.  It's easy to work the math out.
  // My method is a little ghetto, but I don't care.  It works
  // and it's easy to understand.
  var scale_offset = Math.cos((15.0 * Math.PI) / 180.0);

  // points_tracker[y][x] = point - this exists only as a tool to
  // keep track of points for wall building.
  var points_tracker = Array(ysize + 1);

  for (var y = 0; y <= ysize; y += 2) {
    points_tracker[y] = Array(xsize + 2);
    if (y > 1) {
      points_tracker[y - 1] = Array(xsize + 2);
    }

    for (var x = 0; x <= xsize; x += 3) {
      points_tracker[y][x] = new Point(x, y);
      all_points.push(points_tracker[y][x]);

      if (x > 0) {
        // Build 3 walls back along x
        points_tracker[y][x - 1] = new Point(x - 1, y);
        all_points.push(points_tracker[y][x - 1]);
        all_walls.push(
          new Wall(points_tracker[y][x], points_tracker[y][x - 1])
        );

        points_tracker[y][x - 2] = new Point(x - 2, y);
        all_points.push(points_tracker[y][x - 2]);
        all_walls.push(
          new Wall(points_tracker[y][x - 1], points_tracker[y][x - 2])
        );

        all_walls.push(
          new Wall(points_tracker[y][x - 2], points_tracker[y][x - 3])
        );
      }

      if (y > 0) {
        // Build 3 walls back again.
        points_tracker[y - 1][x + 1] = new Point(x + 1, y - 1);
        all_points.push(points_tracker[y - 1][x + 1]);
        all_walls.push(
          new Wall(points_tracker[y][x], points_tracker[y - 1][x + 1])
        );

        points_tracker[y - 1][x] = new Point(x, y - 1);
        all_points.push(points_tracker[y - 1][x]);
        all_walls.push(
          new Wall(points_tracker[y - 1][x + 1], points_tracker[y - 1][x])
        );

        all_walls.push(
          new Wall(points_tracker[y - 1][x], points_tracker[y - 2][x])
        );

        if (x > 0) {
          // Note that this is the "center"
          points_tracker[y - 1][x - 1] = new Point(x - 1, y - 1);
          all_points.push(points_tracker[y - 1][x - 1]);

          all_walls.push(
            new Wall(points_tracker[y - 1][x - 1], points_tracker[y][x - 1])
          );
          all_walls.push(
            new Wall(points_tracker[y - 1][x - 1], points_tracker[y - 1][x])
          );
          all_walls.push(
            new Wall(points_tracker[y - 1][x - 1], points_tracker[y - 1][x - 2])
          );
          all_walls.push(
            new Wall(points_tracker[y - 1][x - 1], points_tracker[y - 2][x - 2])
          );
        }
      }
    }
  }

  // Set cell offsets
  for (var x = 2; x < xsize; x += 3) {
    for (var y = 1; y < ysize; y += 2) {
      // The cell at x,y is a "center" cell.  I'll make it "1,1" for purposes of this.
      center = points_tracker[y][x];
      center.x = (((center.x - 2) / 3) * 2 + 1) * scale_offset;
      center.y = center.y * scale_offset;

      var center_x = center.x;
      var center_y = center.y;

      // 4 points connected to center
      points_tracker[y + 1][x].x = center_x + p1.x;
      points_tracker[y + 1][x].y = center_y + p1.y;

      points_tracker[y][x + 1].x = center_x + p1.y;
      points_tracker[y][x + 1].y = center_y - p1.x;

      if (y == 1) {
        points_tracker[y - 1][x - 1].x = center_x - p1.x;
        points_tracker[y - 1][x - 1].y = center_y - p1.y;
      }

      if (x == 2) {
        points_tracker[y][x - 1].x = center_x - p1.y;
        points_tracker[y][x - 1].y = center_y + p1.x;
      }

      // Next 4 points CW
      points_tracker[y + 1][x + 1].x = center_x + p2.x;
      points_tracker[y + 1][x + 1].y = center_y + p2.y;

      if (y == 1) {
        points_tracker[y - 1][x - 2].x = center_x - p2.x;
        points_tracker[y - 1][x - 2].y = center_y - p2.y;

        points_tracker[y - 1][x + 1].x = center_x + p2.y;
        points_tracker[y - 1][x + 1].y = center_y - p2.x;
      }

      if (x == 2) {
        points_tracker[y + 1][x - 2].x = center_x - p2.y;
        points_tracker[y + 1][x - 2].y = center_y + p2.x;
      }

      // Next 4 points CW
      points_tracker[y][x + 2].x = center_x + p3.x;
      points_tracker[y][x + 2].y = center_y + p3.y;

      if (x == 2) {
        points_tracker[y][x - 2].x = center_x - p3.x;
        points_tracker[y][x - 2].y = center_y - p3.y;
      }

      points_tracker[y + 1][x - 1].x = center_x - p3.y;
      points_tracker[y + 1][x - 1].y = center_y + p3.x;

      if (y == 1) {
        points_tracker[y - 1][x].x = center_x + p3.y;
        points_tracker[y - 1][x].y = center_y - p3.x;
      }
    }
  }

  for (x = 0; x <= xsize; x++) {
    for (y = 0; y <= ysize; y++) {
      if (points_tracker[y] && points_tracker[y][x]) {
        if (points_tracker[y][x].x == x || points_tracker[y][x].y == y) {
          console.log(
            "Unmoved point: " +
              x +
              "," +
              y +
              " is at " +
              points_tracker[y][x].x +
              "," +
              points_tracker[y][x].y
          );
        }
      }
    }
  }

  // Last, set the start and end points
  this.start_point = points_tracker[0][0];
  this.end_point = points_tracker[ysize][xsize];

  // Reset xsize and ysize to reflect actual size of maze
  this.xsize = points_tracker[ysize - 1][xsize].x;
  this.ysize = points_tracker[ysize][xsize].y;
};

// Round maze.
// So, xsize becomes a ring count and ysize becomes a density
// measurement.  The first two rings are the center and are one
// single cell.  The density tells how many cells will be
// around the first complete ring (the third ring).  That also
// sets the minimum cell size.
//
// As the maze adds rings, the cells will become larger.  When
// the cells are twice or more the size of the original cells
// at ring 3 they will split.
//
// The cells on each ring will be staggered from the next.
Maze.base_styles.round = function (ring_count, density, all_points, all_walls) {
  // points_tracker[ring][i] = point - this exists only as a tool to
  // keep track of points for wall building.
  var points_tracker = Array(ring_count + 1);

  this.xsize = ring_count * 2;
  this.ysize = ring_count * 2;

  var inner_radius = 1;

  var radians = Math.PI * 2.0;

  // Determine when to split the cells
  var smallest_outer_length = 2.0 * (((inner_radius + 1) * radians) / density);

  for (var ring = inner_radius; ring <= ring_count; ring++) {
    points_tracker[ring] = Array(density);
    var this_outer_length = 2.0 * ((ring * radians) / density);
    var splitting = this_outer_length > smallest_outer_length * 2.0;
    if (splitting) {
      density *= 2;
    }
    for (var i = 0; i < density; i++) {
      var x, y, theta;
      theta = (i * radians) / density;
      x = ring * Math.cos(theta) + ring_count;
      y = ring * Math.sin(theta) + ring_count;
      points_tracker[ring][i] = new Point(x, y);
      all_points.push(points_tracker[ring][i]);
      // Build ring
      if (i > 0) {
        all_walls.push(
          new Wall(points_tracker[ring][i - 1], points_tracker[ring][i])
        );
      }
      // Build radial walls
      if (ring > inner_radius) {
        // This will stagger the walls.
        if (splitting) {
          if ((i & 1) == 0 && ((i / 2) & 1) == (ring & 1)) {
            all_walls.push(
              new Wall(points_tracker[ring - 1][i / 2], points_tracker[ring][i])
            );
          }
        } else {
          if ((i & 1) == (ring & 1)) {
            all_walls.push(
              new Wall(points_tracker[ring - 1][i], points_tracker[ring][i])
            );
          }
        }
      }
    }
    // complete the ring
    all_walls.push(
      new Wall(points_tracker[ring][density - 1], points_tracker[ring][0])
    );
  }

  // Last, set the start and end points
  this.start_point = points_tracker[ring_count][0];
  this.end_point = points_tracker[ring_count][Math.round(density / 2)];
};

function penrose_maze(style, iterations, all_points, all_walls, maze) {
  var golden_ratio = (1 + Math.sqrt(5)) / 2.0;

  // Triangle with three points.  Note that no line is
  // drawn between points b and c, so we'll always end up
  // with b & c lining up with b & c from another such
  // triangle to make a rhombus.
  // The "color" is either 0 or 1.  Color of 0 indicates
  // that the angle at point a (between lines a-b and a-c)
  // is 36 degrees.  For color 1 it is 108 degrees.
  function Triangle(color, a, b, c) {
    this.color = color;
    this.a = a;
    this.b = b;
    this.c = c;
  }

  Triangle.prototype = {
    // subdivide will return an array of triangles.  For
    // color 0 it will return 2 triangles; for color 1 it
    // will return 3 triangles.
    subdivide: function () {
      if (this.color == 0) {
        var p = this.a.plus(this.b.minus(this.a).divided_by(golden_ratio));
        return [
          new Triangle(0, this.c, p, this.b),
          new Triangle(1, p, this.c, this.a),
        ];
      } else if (this.color == 1) {
        var q = this.b.plus(this.a.minus(this.b).divided_by(golden_ratio));
        var r = this.b.plus(this.c.minus(this.b).divided_by(golden_ratio));
        return [
          new Triangle(1, r, this.c, this.a),
          new Triangle(1, q, r, this.b),
          new Triangle(0, r, q, this.a),
        ];
      }
    },

    // Remove all wall references from points
    remove_walls: function () {
      this.a.remove_walls();
      this.b.remove_walls();
      this.c.remove_walls();
    },
  };

  // Turn an array of Triangles into an array of Cells with
  // walls.
  function triangles_to_points_and_walls(triangles, all_points, all_walls) {
    // Simple way to get unique list of points - this first
    // iteration ensures that all points that are on top of each
    // other are mapped to a single point.
    var points_lookup = {};
    for (var i = 0; i < triangles.length; i++) {
      var triangle = triangles[i];
      triangle.remove_walls();
      if (points_lookup[triangle.a.toString()]) {
        if (points_lookup[triangle.a.toString()] != triangle.a) {
          triangle.a = points_lookup[triangle.a.toString()];
        }
      } else {
        points_lookup[triangle.a.toString()] = triangle.a;
      }
      if (points_lookup[triangle.b.toString()]) {
        if (points_lookup[triangle.b.toString()] != triangle.b) {
          triangle.b = points_lookup[triangle.b.toString()];
        }
      } else {
        points_lookup[triangle.b.toString()] = triangle.b;
      }
      if (points_lookup[triangle.c.toString()]) {
        if (points_lookup[triangle.c.toString()] != triangle.c) {
          triangle.c = points_lookup[triangle.c.toString()];
        }
      } else {
        points_lookup[triangle.c.toString()] = triangle.c;
      }
    }

    // Now, with all points corrected make the walls
    for (var i = 0; i < triangles.length; i++) {
      var triangle = triangles[i];
      // Each triangle has 3 points and two walls - ab and ac.
      var wall = new_unique_wall(triangle.a, triangle.b);
      if (wall) all_walls.push(wall);
      wall = new_unique_wall(triangle.a, triangle.c);
      if (wall) all_walls.push(wall);
      //wall = new_unique_wall(triangle.b,triangle.c);
      //if (wall) all_walls.push(wall);
    }

    // Get all points
    for (var pointstr in points_lookup) {
      if (points_lookup.hasOwnProperty(pointstr)) {
        var point = points_lookup[pointstr];
        all_points.push(point);
      }
    }
  }

  // Only create a wall if another such wall doesn't exist
  function new_unique_wall(p1, p2) {
    var found = false;
    for (var i = 0; i < p1.walls.length; i++) {
      if (p1.walls[i].other_end(p1) == p2) {
        found = true;
        break;
      }
    }
    if (found) {
      return false;
    } else {
      return new Wall(p1, p2);
    }
  }

  // Takes an array of triangles and returns a new array
  // of triangles representing one iteration of subdivision.
  function penrose_iteration(triangles, iterations) {
    var start = triangles,
      ret = [];
    if (!iterations || iterations < 1) iterations = 1;
    for (var j = 0; j < iterations; j++) {
      ret = [];
      for (var i = 0; i < start.length; i++) {
        ret = ret.concat(start[i].subdivide());
      }
      start = ret;
    }
    return ret;
  }

  // Makes an initial pattern that will be iterated on
  function make_penrose_pattern(type) {
    var ret = [];

    if (type == "sun") {
      var a = new Point(0, 0);

      // This is a sun pattern, doing this in semi-polar coordinates
      var points = new Array(10);
      for (var i = 0; i < 10; i += 2) {
        points[i] = new Point(
          Math.cos((2.0 * i * Math.PI) / 10.0),
          Math.sin((2.0 * i * Math.PI) / 10.0)
        );
        points[i + 1] = new Point(
          Math.cos((2.0 * (i + 1) * Math.PI) / 10.0),
          Math.sin((2.0 * (i + 1) * Math.PI) / 10.0)
        );
      }

      for (var i = 0; i < 10; i += 2) {
        // These two triangles share point b
        var b = points[i + 1];
        var c = points[i];
        ret.push(new Triangle(0, a, b, c));
        var c = points[(i + 2) % 10];
        ret.push(new Triangle(0, a, b, c));
      }
    } else {
      // This is a star pattern
      var short_line = 0.5 / Math.cos((36.0 * Math.PI) / 180.0);
      var b = new Point(0, 0);

      var points = new Array(10);
      for (var i = 0; i < 10; i += 2) {
        points[i] = new Point(
          Math.cos((2.0 * (i - 0.5) * Math.PI) / 10.0),
          Math.sin((2.0 * (i - 0.5) * Math.PI) / 10.0)
        );
        points[i + 1] = new Point(
          short_line * Math.cos((2.0 * (i + 0.5) * Math.PI) / 10.0),
          short_line * Math.sin((2.0 * (i + 0.5) * Math.PI) / 10.0)
        );
      }

      for (var i = 0; i < 10; i += 2) {
        // These two triangles share point b
        var a = points[i + 1];
        var c = points[i];
        ret.push(new Triangle(1, a, b, c));
        var c = points[(i + 2) % 10];
        ret.push(new Triangle(1, a, b, c));
      }
    }

    return ret;
  }

  var triangles = make_penrose_pattern(style);
  triangles = penrose_iteration(triangles, iterations);
  triangles_to_points_and_walls(triangles, all_points, all_walls);
  // Make start and end - set to next to greatest x and next
  // to least x
  var biggest = null,
    second_biggest = null;
  var smallest = null,
    second_smallest = null;
  for (var x = 0; x < all_points.length; x++) {
    var point = all_points[x];
    if (!biggest) {
      biggest = point;
    } else {
      if (point.x > biggest.x) {
        second_biggest = biggest;
        biggest = point;
      }
    }
    if (!smallest) {
      smallest = point;
    } else {
      if (point.x < smallest.x) {
        second_smallest = smallest;
        smallest = point;
      }
    }
  }
  maze.start_point = second_smallest;
  maze.end_point = second_biggest;

  // scale and translate
  for (var x = 0; x < all_points.length; x++) {
    var point = all_points[x];
    point.x = point.x * 50.0 + 50.0;
    point.y = point.y * 50.0 + 50.0;
  }

  // set xsize and ysize
  maze.xsize = 100;
  maze.ysize = 100;
}

Maze.base_styles.penrose_sun = function (
  iterations,
  ignored,
  all_points,
  all_walls
) {
  penrose_maze("sun", iterations, all_points, all_walls, this);
};

Maze.base_styles.penrose_star = function (
  iterations,
  ignored,
  all_points,
  all_walls
) {
  penrose_maze("star", iterations, all_points, all_walls, this);
};

Maze.base_styles_info = {
  square: {
    min_xsize: 2,
    min_ysize: 2,
    x_multiplier: 1,
    y_multiplier: 1,
    max_face_size: 4,
    algo: Maze.base_styles.square,
  },
  triangle: {
    min_xsize: 2,
    min_ysize: 2,
    x_multiplier: 2,
    y_multiplier: 1,
    max_face_size: 3,
    algo: Maze.base_styles.triangle,
  },
  hexagonal: {
    min_xsize: 4,
    min_ysize: 4,
    x_multiplier: 1,
    y_multiplier: 1,
    max_face_size: 6,
    algo: Maze.base_styles.hexagonal,
  },
  diamond: {
    min_xsize: 4,
    min_ysize: 4,
    x_multiplier: 2,
    y_multiplier: 2,
    max_face_size: 4,
    algo: Maze.base_styles.diamond,
  },
  squaretriangles: {
    min_xsize: 4,
    min_ysize: 4,
    x_multiplier: 2,
    y_multiplier: 2,
    max_face_size: 4,
    algo: Maze.base_styles.squaretriangles,
  },
  snubsquare: {
    min_xsize: 3,
    min_ysize: 3,
    x_multiplier: 1,
    y_multiplier: 1,
    max_face_size: 4,
    algo: Maze.base_styles.snubsquare,
  },
  snubsquare2: {
    min_xsize: 2,
    min_ysize: 2,
    x_multiplier: 1,
    y_multiplier: 1,
    max_face_size: 4,
    algo: Maze.base_styles.snubsquare2,
  },
  cairo: {
    min_xsize: 2,
    min_ysize: 2,
    x_multiplier: 1,
    y_multiplier: 1,
    max_face_size: 5,
    algo: Maze.base_styles.cairo,
  },
  round: {
    min_xsize: 2,
    min_ysize: 2,
    x_multiplier: 1,
    y_multiplier: 1,
    max_face_size: 20,
    algo: Maze.base_styles.round,
  },
  "penrose-sun": {
    min_xsize: 2,
    min_ysize: 2,
    x_multiplier: 1,
    y_multiplier: 1,
    max_face_size: 4,
    algo: Maze.base_styles.penrose_sun,
  },
  "penrose-star": {
    min_xsize: 2,
    min_ysize: 2,
    x_multiplier: 1,
    y_multiplier: 1,
    max_face_size: 4,
    algo: Maze.base_styles.penrose_star,
  },
};

Maze.maze_styles_info = {
  recursive: {
    name: "recursive",
    algo: Maze.maze_styles.recursive,
  },
  prim: {
    name: "Prim's Algorithm",
    algo: Maze.maze_styles.prim,
  },
  bacterial: {
    name: "Bacterial",
    algo: Maze.maze_styles.bacterial,
  },
  unicursal: {
    name: "unicursal",
    algo: Maze.maze_styles.unicursal,
  },
  drunk_walk: {
    name: "drunk_walk",
    algo: Maze.maze_styles.drunk_walk,
  },
};

// To ease the face-finding algorithm, we can sort the walls at
// each point in order of angle.
Maze.prototype.sort_walls_for_points = function (points) {
  for (var i = 0; i < points.length; i++) {
    points[i].sort_walls();
  }
};

// Find the upper left starting wall
Maze.prototype.find_start_wall = function (points) {
  var start_cell = this.start_point.walls[0].cells[0];
  // First, try to find a horizontal wall
  for (var k = 0; k < this.start_point.walls.length; k++) {
    var wall = this.start_point.walls[k];
    if (
      wall.cells.length == 1 &&
      !wall.is_open() &&
      wall.other_end(this.start_point).y == this.start_point.y
    ) {
      return wall;
    }
  }
  // If that doesn't work, find one that is at the upper left
  for (var k = 0; k < this.start_point.walls.length; k++) {
    var wall = this.start_point.walls[k];
    if (
      wall.cells.length == 1 &&
      !wall.is_open() &&
      wall.other_end(this.start_point).x <= this.start_point.x
    ) {
      return wall;
    }
  }
  // And if that doesn't work, grab the first one that I can
  for (var k = 0; k < this.start_point.walls.length; k++) {
    var wall = this.start_point.walls[k];
    if (wall.cells.length == 1 && !wall.is_open()) {
      return wall;
    }
  }
};

// Find the lower right ending wall
Maze.prototype.find_end_wall = function (points) {
  var end_cell = this.end_point.walls[0].cells[0];
  // First, try to find one that's flat on the bottom
  for (var k = 0; k < this.end_point.walls.length; k++) {
    var wall = this.end_point.walls[k];
    if (
      wall.cells.length == 1 &&
      !wall.is_open() &&
      wall.other_end(this.end_point).y == this.end_point.y
    ) {
      return wall;
    }
  }
  // If that doesn't work, try to find one that's at the lower right
  for (var k = 0; k < this.end_point.walls.length; k++) {
    var wall = this.end_point.walls[k];
    if (
      wall.cells.length == 1 &&
      !wall.is_open() &&
      wall.other_end(this.end_point).x >= this.end_point.x
    ) {
      return wall;
    }
  }
  // And if that doesn't work just grab one
  for (var k = this.end_point.walls.length - 1; k >= 0; k--) {
    var wall = this.end_point.walls[k];
    if (wall.cells.length == 1 && !wall.is_open()) {
      return wall;
    }
  }
};

// Opens the corners - knocks down walls to create a start and
// end for the maze.
Maze.prototype.open_corners = function () {
  // open opposite corners
  this.start_wall.open();
  this.end_wall.open();
};

//////////////////////////////////////////////////////////////
//	  //
//	   Everything from here down pertains to display	  //
//	  //
//////////////////////////////////////////////////////////////

// Clear an existing svg element
function destroy_svg_element(div_id) {
  var container_div = document.getElementById(div_id);
  var svgs = container_div.getElementsByTagName("svg");
  for (var i = 0; i < svgs.length; i++) {
    container_div.removeChild(svgs[i]);
  }
}

// Creates an svg element inside a container div
function create_svg_element(div_id) {
  var container_div = document.getElementById(div_id);
  var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("version", "1.2");
  svg.setAttribute("baseProfile", "tiny");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  //svg.setAttribute("viewBox", "-1.02 -1.02 2.04 2.04");
  var style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  var stylesheet = document.createTextNode("line.wall.open { display: none; }");
  style.appendChild(stylesheet);
  svg.appendChild(style);
  container_div.appendChild(svg);
  console.log("SSSVVVGGG", svg);
  return svg;
}

// Get the svg
function find_svg(div_id) {
  var container_div = document.getElementById(div_id);
  return container_div.getElementsByTagName("svg")[0];
}

// Find a reference to the svg's stylesheet
function svg_find_stylesheet(svg) {
  return svg.getElementsByTagName("style")[0];
}

// Get the svg's width.  The issue here is that on Firefox the
// svg's offsetWidth is undefined, so I need to instead get the
// parent's offsetWidth.
function svg_width(svg) {
  return svg.offsetWidth || svg.parentNode.offsetWidth;
}

// Get the height of the svg.
function svg_height(svg) {
  return svg.offsetHeight || svg.parentNode.offsetHeight;
}

// Given the number of cells and svg, compute a width for
// a single cell.
function xmult_for(xsize, svg) {
  return svg_width(svg) / (xsize + 2);
}

// Given the number of cells and svg, compute a height for
// a single cell.
function ymult_for(ysize, svg) {
  return svg_height(svg) / (ysize + 2);
}

// Draw the background for the maze
function draw_gradient_bg(end_depth, max_depth, svg) {
  /*var defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
	defs.setAttribute('id', 'svgdefs');
	svg.appendChild(defs);

	var lg = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
	lg.setAttribute('id', 'svgbg');
	lg.setAttribute('x1', '0%');
	lg.setAttribute('x2', '100%');
	lg.setAttribute('y1', '0%');
	lg.setAttribute('y2', '100%');
	defs.appendChild(lg);

	var stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
	stop1.setAttribute('id', 'stop1');
	stop1.setAttribute('offset', '0%');
	stop1.setAttribute('stop-color', 'rgb(0,0,0)');
	lg.appendChild(stop1);

	var stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
	stop2.setAttribute('id', 'stop2');
	stop2.setAttribute('offset', '100%');
	stop2.setAttribute('stop-color', 'rgb(0,0,0)');
	lg.appendChild(stop2);

	var r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
	r.setAttribute("x", 0);
	r.setAttribute("y", 0);
	r.setAttribute("width", svg_width(svg));
	r.setAttribute("height", svg_height(svg));
	r.setAttribute("fill", 'url(#svgbg)');
	r.setAttribute("stroke", 'rgb(0,0,0)');
	r.setAttribute("stroke-width", "1");
	r.setAttribute("id", "bg");
	svg.appendChild(r);*/
}

// Draws the cells shaded according to depth, with
// light blue being "shallow" and black being "deep"
function draw_cell_depths(cells, xsize, ysize, max_depth, svg) {
  /*var xmult = xmult_for(xsize, svg);
	var ymult = ymult_for(ysize, svg);
	for (var x=0 ; x < cells.length ; x++) {
		var cell = cells[x];
		var points = cell.vertices();
		var points_list = [];
		for (var i=0 ; i < points.length ; i++) {
			points_list.push("" + Math.floor(points[i].x * xmult + xmult) + "," + Math.floor(points[i].y * ymult + ymult));
		}
		var p = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
		p.setAttribute("points", points_list.join(" "));
		p.setAttribute("fill", 'rgb(0,0,0)');
		p.setAttribute("stroke", 'rgb(0,0,0)');
		p.setAttribute("stroke-width", "1");
		p.setAttribute("class", "depth-map");
		svg.appendChild(p);
	}*/
}

// Draws a set of walls on an svg
function draw_walls(walls, xsize, ysize, svg) {
  var xmult = xmult_for(xsize, svg);
  var ymult = ymult_for(ysize, svg);
  for (var x = 0; x < walls.length; x++) {
    var wall = walls[x];
    var l = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l.setAttribute("x1", wall.points[0].x * xmult + xmult);
    l.setAttribute("y1", wall.points[0].y * ymult + ymult);
    l.setAttribute("x2", wall.points[1].x * xmult + xmult);
    l.setAttribute("y2", wall.points[1].y * ymult + ymult);
    if (wall.is_open()) {
      l.setAttribute("stroke", "#000000");
      l.setAttribute("stroke-width", "1");
      l.setAttribute("class", "open wall");
    } else {
      l.setAttribute("stroke", "#000000");
      l.setAttribute("stroke-width", "1");
      l.setAttribute("class", "closed wall");
    }
    svg.appendChild(l);
  }
}

// Just draw a "point"
function draw_point(x, y, color, xsize, ysize, svg) {
  var xmult = xmult_for(xsize, svg);
  var ymult = ymult_for(ysize, svg);
  var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("cx", x * xmult + xmult);
  c.setAttribute("cy", y * ymult + ymult);
  c.setAttribute("r", 2);
  c.setAttribute("stroke", color);
  c.setAttribute("stroke-width", "1");
  c.setAttribute("class", "point");
  svg.appendChild(c);
}

// This code is useful for debugging the face-finding
// algorithm.  It puts a red dot in the middle of every
// face.
function show_cell_centers(cells, xsize, ysize, svg) {
  var xmult = xmult_for(xsize, svg);
  var ymult = ymult_for(ysize, svg);
  for (var x = 0; x < cells.length; x++) {
    var cell = cells[x];
    var center = cell.center();
    var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", center.x * xmult + xmult);
    c.setAttribute("cy", center.y * ymult + ymult);
    c.setAttribute("r", 2);
    c.setAttribute("stroke", "#000000");
    c.setAttribute("stroke-width", "1");
    c.setAttribute("class", "cell-center");
    svg.appendChild(c);
  }
}

// This code is useful for debugging - it shows a red dot over
// the start and end points.
function show_start_and_end_points(maze, xsize, ysize, svg) {
  var xmult = xmult_for(xsize, svg);
  var ymult = ymult_for(ysize, svg);
  var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("cx", maze.end_point.x * xmult + xmult);
  c.setAttribute("cy", maze.end_point.y * ymult + ymult);
  c.setAttribute("r", 2);
  c.setAttribute("stroke", "#000000");
  c.setAttribute("stroke-width", "1");
  c.setAttribute("class", "end-point");
  svg.appendChild(c);
  var c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("cx", maze.start_point.x * xmult + xmult);
  c.setAttribute("cy", maze.start_point.y * ymult + ymult);
  c.setAttribute("r", 2);
  c.setAttribute("stroke", "#000000");
  c.setAttribute("stroke-width", "1");
  c.setAttribute("class", "start-point");
  svg.appendChild(c);
}

// Draw the solution to the maze, starting at the end wall and
// tracing back to the starting wall.
function show_maze_solution(maze, xsize, ysize, svg) {
  var xmult = xmult_for(xsize, svg);
  var ymult = ymult_for(ysize, svg);

  var points = [];

  // First, draw from the center of the end wall to the center
  // of the end cell.
  var end_wall_center = maze.end_wall.center();
  var end_cell = maze.end_cell();

  points.push(end_wall_center);

  var start_wall_center = maze.start_wall.center();
  var start_cell = maze.start_cell();

  var current_cell = end_cell;

  do {
    points.push(current_cell.center());
    current_cell = current_cell.entry_wall.neighbor(current_cell);
  } while (current_cell != start_cell);

  points.push(start_cell.center());
  points.push(start_wall_center);

  var points_xy = [];
  for (var i = 0; i < points.length; i++) {
    points_xy.push(
      "" + (points[i].x * xmult + xmult) + "," + (points[i].y * ymult + ymult)
    );
  }

  var points_str = points_xy.join(" ");

  var pl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  pl.setAttribute("points", points_str);
  pl.setAttribute("fill", "none");
  pl.setAttribute("stroke", "#ff0000");
  pl.setAttribute("stroke-width", "1");
  if (!show_solution) {
    pl.setAttribute("style", "display: none;");
  }
  pl.setAttribute("id", "solution");
  svg.appendChild(pl);
}

// Selectors for various maze parts:
//
// #bg - The background gradiant
// .depth-map - The individual faces in the depth map
// .wall - All wall segments
// .open - Open (invisible) wall segments
// .closed - Closed (visible) wall segments
// #solution - The path that shows the maze solution
// .cell-center - Dots that mark the center of each cell
// #end-point, #start-point - Dots that mark the official start
//	 and end points
//
// Leaving these as globals
var args = get_args();

var xsize = parseInt(args["xsize"]);
var ysize = parseInt(args["ysize"]);
var maze_style = args["style"];
var maze_algorithm = args["algo"];
var show_solution = args["solution"];
if (!xsize) xsize = 10;
if (!ysize) ysize = 10;
if (!maze_style) maze_style = "square";
if (!maze_algorithm) maze_algorithm = "recursive";

// Actually makes the maze
function make_a_maze() {
  var maze = new Maze(xsize, ysize, maze_style, maze_algorithm);

  // With the maze created, we'll display it
  destroy_svg_element("svg-container");
  var svg = create_svg_element("svg-container");
  //set svg height
  svg.setAttribute(
    "height",
    `${(ysize / xsize) * (window.innerWidth * 0.4)}px`
  );
  draw_cell_depths(maze.cells, maze.xsize, maze.ysize, maze.max_depth, svg);
  draw_walls(maze.walls, maze.xsize, maze.ysize, svg);
  show_maze_solution(maze, maze.xsize, maze.ysize, svg);
  //show_cell_centers(maze.cells, maze.xsize, maze.ysize, svg);
  //show_start_and_end_points(maze, maze.xsize, maze.ysize, svg);
  // newMazeLogic();
}

function set_up_form() {
  var maze_style_selector = document.getElementById("maze-style-selector");
  for (var key in Maze.base_styles_info) {
    var opt = document.createElement("option");
    opt.setAttribute("value", key);
    opt.appendChild(document.createTextNode(key));
    maze_style_selector.appendChild(opt);
  }

  var maze_algorithm_selector = document.getElementById(
    "maze-algorithm-selector"
  );
  for (var key in Maze.maze_styles_info) {
    var opt = document.createElement("option");
    opt.setAttribute("value", key);
    opt.appendChild(document.createTextNode(Maze.maze_styles_info[key].name));
    maze_algorithm_selector.appendChild(opt);
  }

  // Now set the defaults
  var x_size_input = document.getElementById("x-size-input");
  var y_size_input = document.getElementById("y-size-input");
  var show_solution_input = document.getElementById("show-solution-input");
  x_size_input.value = xsize;
  y_size_input.value = ysize;
  show_solution_input.checked = show_solution;
  maze_style_selector.value = maze_style;
  maze_algorithm_selector.value = maze_algorithm;
}

function new_maze() {
  var maze_style_selector = document.getElementById("maze-style-selector");
  var maze_algorithm_selector = document.getElementById(
    "maze-algorithm-selector"
  );
  var x_size_input = document.getElementById("x-size-input");
  var y_size_input = document.getElementById("y-size-input");
  var show_solution_input = document.getElementById("show-solution-input");
  xsize = parseInt(x_size_input.value);
  ysize = parseInt(y_size_input.value);
  maze_style = maze_style_selector.value;
  maze_algorithm = maze_algorithm_selector.value;
  show_solution = show_solution_input.checked;

  make_a_maze();
}

function toggle_solution() {
  var show_solution_input = document.getElementById("show-solution-input");
  show_solution = show_solution_input.checked;
  var solution = document.getElementById("solution");
  if (show_solution) {
    solution.setAttribute("style", "");
  } else {
    solution.setAttribute("style", "display: none;");
  }
}

add_body_onload(set_up_form);
add_body_onload(make_a_maze);

// var c = document.getElementById("canvas");
// var ctx = c.getContext("2d");
function newMazeLogic() {
  console.log("New Maze");

  var xSize = document.getElementById("x-size-input").value * 1,
    ySize = document.getElementById("y-size-input").value * 1;

  var svg = document.getElementsByTagName("svg")[0];
  var svgC = document.getElementById("svg-container");
  // Shift Black Border Lines
  for (
    var lineI = 0;
    lineI < svg.getElementsByTagName("line").length;
    lineI++
  ) {
    line = svg.getElementsByTagName("line")[lineI];
    if (xSize < ySize) {
      line.x1.baseVal.value = line.x1.baseVal.value * (xSize / ySize);
      line.x2.baseVal.value = line.x2.baseVal.value * (xSize / ySize);
    } else {
      line.y1.baseVal.value = line.y1.baseVal.value * (ySize / xSize);
      line.y2.baseVal.value = line.y2.baseVal.value * (ySize / xSize);
    }
  }
  // Shift Red Solution Lines
  for (
    var polylineI = 0;
    polylineI < document.getElementsByTagName("polyline").length;
    polylineI++
  ) {
    for (
      var pointI = 0;
      pointI <
      document.getElementsByTagName("polyline")[polylineI].points.length;
      pointI++
    ) {
      var point = document.getElementsByTagName("polyline")[polylineI].points[
        pointI
      ];
      if (xSize < ySize) {
        point.x = point.x * (xSize / ySize);
      } else {
        point.y = point.y * (ySize / xSize);
      }
    }

    // const { height, width } = svg.getBBox();
    // console.log(height, width);
    // svg.setAttribute("height", `${height}px`);
    // svg.setAttribute("width", `${width}px`);
  }

  // function makeImg(svg) {
  //   var svgURL = new XMLSerializer().serializeToString(svg),
  //     img = new Image();
  //   img.width = 1;
  //   img.height = 1;
  //   img.src = "data:image/svg+xml;utf8," + encodeURIComponent(svgURL);
  //   return img;
  // }
  // Download HyperLinks
  var solution = document.getElementById("solution");
  // IMGs
  // document.getElementById("unsolvedImage").width = window.innerWidth * 0.925;
  // document.getElementById("unsolvedImage").height = window.innerWidth * 0.925;
  // document.getElementById("solvedImage").width = window.innerWidth * 0.925;
  // document.getElementById("solvedImage").height = window.innerWidth * 0.925;
  // solution.setAttribute("style", "display: none;");
  // document.getElementById("unsolvedImage").src = makeImg(svg).src;
  // solution.setAttribute("style", "");
  // document.getElementById("solvedImage").src = makeImg(svg).src;
  // // Solved PNG
  // ctx.clearRect(0, 0, c.width, c.height);
  // ctx.drawImage(
  //   document.getElementById("solvedImage"),
  //   0,
  //   0,
  //   c.width,
  //   c.height
  // );
  // document.getElementById("pngDownSolved").href = c.toDataURL('image/png').replace("data:image/png", 'data:application/octet-stream');
  // Unsolved PNG
  // ctx.clearRect(0, 0, c.width, c.height);
  // ctx.drawImage(
  //   document.getElementById("unsolvedImage"),
  //   0,
  //   0,
  //   c.width,
  //   c.height
  // );
  // document.getElementById("pngDown").href = c.toDataURL('image/png').replace(/^data:image\/[^;]/, 'data:application/octet-stream');
  // Reset Solution Visibility
  var show_solution_input = document.getElementById("show-solution-input");
  show_solution = show_solution_input.checked;
  if (show_solution) {
    solution.setAttribute("style", "");
  } else {
    solution.setAttribute("style", "display: none;");
  }
}

//]]>
