function clockMap(divName, topology, data, colormap) {
  width = 800,
  height = 800;

  var rotate = [-60,-20],
  velocity = [.015, -0];

  projection = d3.geo.orthographic()
  .rotate(rotate)
  .clipAngle(90)
  .scale(200)
  .translate([width / 2, height / 2])
  .precision(.2);

  path = d3.geo.path()
  .projection(projection);

  // setup svg
  svg = d3.select(divName).append("svg")
  .attr("width", width)
  .attr("height", height);

  map = svg.append("g")
  .attr("transform", "translate(0,0)");

  // draw grid
  var graticule = d3.geo.graticule();
  map.append("path")
  .datum(graticule)
  .attr("class", "graticule")
  .attr("d", path);

  // draw countries
  var country = map
  .selectAll(".countries")
  .data(topojson.feature(topology, topology.objects.countries).features)
  .enter()
  .append("path")
  .attr("d", path)
  .attr("class", "countries");

    var tooltipMap = d3.select(divName).append("div").attr("class", "tooltipMap hidden");

  // draw country boundaries
  map.append("path")
  .datum(topojson.mesh(topology, topology.objects.countries, function(a, b) { return a !== b; }))
  .attr("class", "boundaries")
  .attr("d", path);

  var face = new clockFace(svg, data, colormap);

  // // rotate
  var startTime = Date.now();
  d3.timer(function() {
    // get current time
    var dt = Date.now() - startTime;
    projection.rotate([rotate[0] +  velocity[0] * dt, rotate[1] +  velocity[1] * dt]);
    map.selectAll("path").attr("d", path);
  });

  this.update = function (year) {
      // set up color map and function
      var colorid = function(d) { 
        try {
          return colormap(data.get(d.id).data.get(year).value);
        }
        catch(err) {return "Gainsboro";}
      }

      var strid = function(d) { 
        try {
          var datum = data.get(d.id).data.get(year).value
          if (datum) {
            return Math.round(datum).toLocaleString('en');}
            else{return "no data"}
          }
        catch(err) { return "no data"} 
      }

      map.selectAll(".countries")
      .style('fill', colorid)
      .on('mousemove', function(d) {
        d3.select(this).style( "fill", "#666");
        var mouse = d3.mouse(svg.node()).map(function(d) {
          return parseInt(d);
        });
        tooltipMap.classed('hidden', false)
        .attr('style', 'left:' + (mouse[0] + 15) +
          'px; top:' + (mouse[1] - 35) + 'px')
        .html(data.get(d.id).name+": "+strid(d));
      })
      .on('mouseout', function() {
        d3.select(this).style('fill', colorid);
        tooltipMap.classed('hidden', true);
      })
      .on('click', function(d) {
        face.update(d.id);
      })
      .attr("d", path);
      face.hand(year);
    }

  }