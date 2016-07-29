  // main plotting function
  function ready(error, topology, raw) {

    // draw countries
    var country = centerMap
    .selectAll(".countries")
    .data(topojson.feature(topology, topology.objects.countries).features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("class", "countries")

    var tooltipMap = d3.select("#world-map").append("div").attr("class", "tooltipMap hidden");

    // draw country boundaries
    centerMap.append("path")
    .datum(topojson.mesh(topology, topology.objects.countries, function(a, b) { return a !== b; }))
    .attr("class", "boundaries")
    .attr("d", path);

    function calculate(raw, numeNm, denoNm) {
      // data calculation
      var points = [];
      function parseData(d, numeNm, denoNm) {
        if (numeNm in d) {
          var se = [];
          $.each(d[numeNm], 
            function(y, v){
              var p = (v/(d[denoNm]));
              points.push(p);
              se.push({"year": y, "value": p});
            });
          return d3.map(se, function(d) {return d.year});
        }
        else{return null;}
      };

      var cleaned = d3.map(
        $.map(raw, function(d) { 
          return {
            id: d.id,
            name: d.name,
            data: parseData(d, numeNm, denoNm)}; 
          }), 
        function(d) {return d.id});

      var colormap = d3.scale
      .quantize()
      .domain(points)
      .range(colors); 
      return {colormap: colormap, cleaned: cleaned};
    }

    function update(cleaned, colormap, year) {  

      // set up color map and function
      var colorid = function(d) { 
        try {
          return colormap(cleaned.get(d.id).data.get(year).value);
        }
        catch(err) {return "Gainsboro";}
      }

      var strid = function(d) { 
        try {
          var datum = cleaned.get(d.id).data.get(year).value
          if (datum) {
            return Math.round(datum).toLocaleString('en');}
            else{return "no data"}
          }
        catch(err) { return "no data"} 
      }

      centerMap.selectAll(".countries")
      .style('fill', colorid)
      .on('mousemove', function(d) {
        d3.select(this).style( "fill", "#666");
        var mouse = d3.mouse(svg.node()).map(function(d) {
          return parseInt(d);
        });
        tooltipMap.classed('hidden', false)
        .attr('style', 'left:' + (mouse[0] + 15) +
          'px; top:' + (mouse[1] - 35) + 'px')
        .html(cleaned.get(d.id).name+": "+strid(d));
      })
      .on('mouseout', function() {
        d3.select(this).style('fill', colorid);
        tooltipMap.classed('hidden', true);
      })
      .on('click', function(d) {
        time_series(result.cleaned, result.colormap, [d.id, -1])
      })
      .attr("d", path);
    }

    // initial result
    var numeNm = numeList[0],
    denoNm = denoList[0];
    var result = calculate(raw, numeNm, denoNm);

    var clock = new time_series(result.cleaned, result.colormap, [76, -1]);

    var startTime = Date.now();
    d3.timer(function() {
      // get current time
      var dt = Date.now() - startTime;
      projection.rotate([rotate[0] + velocity[0] * dt, rotate[1] + velocity[1] * dt]);
      centerMap.selectAll("path").attr("d", path);
    });

    var makeCallback = function() {
    // returning a new callback function each time
    return function() {
      var dt = Date.now() - startTime;
      var currentYear = startYear + Math.round(dt/yearLapse);
      if (currentYear<=endYear) {
        update(result.cleaned, result.colormap, startYear + Math.round(dt/yearLapse));
        clock.hand(currentYear);
        d3.timer(makeCallback(), yearLapse);
        return true;}
      else {return false;}
    };
  };

  d3.timer(makeCallback(), yearLapse);

  d3.select("#deno").on("change", function(d){
    denoSwitch = -denoSwitch; 
    denoNm = denoList[(denoSwitch+0.5)|0];
    result = calculate(raw, numeNm, denoNm);
    update(result.cleaned, result.colormap, 2009);
    time_series(result.cleaned, result.colormap, [76, -1]);
  });

  d3.select("#nume").on("change", function(d){
    numeSwitch = -numeSwitch; 
    numeNm = numeList[(numeSwitch+0.5)|0];
    result = calculate(raw, numeNm, denoNm);
    update(result.cleaned, result.colormap, 2009);
  });
}

function time_series(cleaned, colormap, ids) {
  var outerRadius = 240,
  innerRadius = 205;
  gap = 2,
  bandwidth = (outerRadius - innerRadius - gap*(ids.length - 1))/ids.length,
  colors = colormap.range(),
  layers = d3.map([]);

  // fiil 0 for missing values
  ids.forEach(function(id, index) {
    var d = cleaned.get(id),
    data_temp = [];
    for (var y = startYear; y <= endYear; y++) {
      if (d.data.has(y)) {
        data_temp.push(d.data.get(y));
      }
      else {
        data_temp.push({year:y, value:0});
      }
    };

    var layer = {
      data: data_temp,
      name: d.name,
      y0: innerRadius + index*bandwidth + index*gap
    };
    layers.set(id, layer);
  });  

 // data head for selection
  var dataHead = [];
  ids.forEach(function(id) {
    colors.forEach(function(color) {
      dataHead.push({'id': id, 'color': color});
    });
  });

  // angle, radius and area
  var angle = d3.scale.linear()
  .range([0, 2 * Math.PI])
  .domain([startYear, endYear])
  .clamp(true);

  var radius = d3.scale.linear()
  .clamp(true);

  var area = d3.svg.area.radial()
  .interpolate("cardinal-closed")
  .angle(function(d) {return angle(d.year); })
  .outerRadius(function(d) {return radius(d.value)});

  // var line = d3.svg.line.radial()
  // .interpolate("cardinal-closed")
  // .angle(function(d) { return angle(d.time); })

  svg.selectAll(".time-layer").remove()

  var clock = svg.append("g")
  .attr("transform", "translate(" + width/2 + "," + height / 2 + ")");

  clock.selectAll(".time-layer")
  .data(dataHead)
  .enter()
  .append("path")
  .attr("class", "time-layer")
  .attr("d", function(d) {
    var y0 = layers.get(d.id).y0;
    radius
    .range([y0, y0 + bandwidth])
    .domain(colormap.invertExtent(d.color));

    area
    .innerRadius(y0);

    return area(layers.get(d.id).data); } )
  .attr("fill", function(d) {return d.color});

  // invisable layer for mouseover
  var invertCord = function (cord) {
    var a = Math.atan(-cord[0]/cord[1]);
    if (cord[1]>0) {
      return a + Math.PI;
    }
    else {
      if (cord[0]*cord[1]>0) {
        return a + 2*Math.PI;
      }
      else {
        return a;
      }
    }
  };

 // add invisible arc for reference
 var base_arc = d3.svg.arc()
 .innerRadius(innerRadius)
 .outerRadius(outerRadius)
 .startAngle(0)
 .endAngle(2 * Math.PI)(outerRadius - innerRadius);

 var base = clock
 .append("path")
 .attr("class", "base-layer")
 .attr("id", "base")
 .attr("d", base_arc)
 .attr("fill", "transparent");

  // append outer arc for guiding text
  var firstArcSection = /(^.+?)M/; 
  var newArc = firstArcSection.exec(base_arc)[0];
  newArc = newArc.replace(/M$/, "Z");

  clock
  .append("path")
  .attr("class", "base-layer")
  .attr("id", "outer-bound")
  .attr("d", newArc)
  .style("fill", "none")
  .style("stroke", "none")

  base.on('mousemove', function () {
    // clean previous
    clock.selectAll(".clock-hover").remove();

    // get mouse postion and angle
    cord = d3.mouse(this);
    r_angle = invertCord(cord);
    r_year = Math.round(angle.invert(r_angle));

    // add ruler
    clock
    .append("path")
    .attr("id", "hover-ruler")
    .attr("class", "clock-hover")
    .attr("fill", "black")
    .attr('stroke', "black")
    .attr('stroke-width', 1)
    .attr("d", d3.svg.line.radial()([[innerRadius, angle(r_year)], [outerRadius, angle(r_year)]]));

    // add year 
    clock
    .append("text")
    .attr("class", "clock-hover")
    .attr("id", "hover-year")
    .attr("transform", function(d) {
      return "translate(" + Math.sin(angle(r_year))*outerRadius*1.01
        + ", " + (- Math.cos(angle(r_year))*outerRadius*1.01) + ")" 
    + "rotate(" + angle(r_year)*180/Math.PI + ")" 
  })
    .text(r_year)
    .attr("text-anchor", "middle");

    // add name and value
    ids.forEach(function(id, index) {
      var r = innerRadius + index*bandwidth + index*gap;
      clock
      .append("text")
      .attr("class", "clock-hover")
      .attr("id", "hover-year")
      .attr("transform", function(d) {
        return "translate(" + Math.sin(angle(r_year))*r*1.01
          + ", " + (- Math.cos(angle(r_year))*r*1.01) + ")" 
      + "rotate(" + angle(r_year)*180/Math.PI + ")" 
    })
      .text(cleaned.get(id).name)
      .attr("text-anchor", "end");

      clock
      .append("text")
      .attr("class", "clock-hover")
      .attr("id", "hover-year")
      .attr("transform", function(d) {
        return "translate(" + Math.sin(angle(r_year))*r*1.01
          + ", " + (- Math.cos(angle(r_year))*r*1.01) + ")" 
      + "rotate(" + angle(r_year)*180/Math.PI + ")" })
      .text(get_value_str(cleaned, id, r_year))
      .attr("text-anchor", "start");
    });
  })
  .on('mouseout', function () {
    clock.selectAll(".clock-hover").remove();
  });


  this.hand = function(year) {
    clock.selectAll(".clock-hand").remove();
     // add ruler
    clock
    .append("path")
    .attr("id", "hand-ruler")
    .attr("class", "clock-hand")
    .attr("fill", "black")
    .attr('stroke', "black")
    .attr('stroke-width', 1)
    .attr("d", d3.svg.line.radial()([[innerRadius, angle(year)], [outerRadius, angle(year)]]));

    // add year 
    clock
    .append("text")
    .attr("class", "clock-hand")
    .attr("id", "hand-year")
    .attr("transform", function(d) {
      return "translate(" + Math.sin(angle(year))*outerRadius*1.01
        + ", " + (- Math.cos(angle(year))*outerRadius*1.01) + ")" 
    + "rotate(" + angle(year)*180/Math.PI + ")" 
  })
    .text(year)
    .attr("text-anchor", "middle");

  }
}

function get_value_str(data, id, year) {
  try { var v = data.get(id).data.get(year).value;
    return (Math.round(v*10)/10).toLocaleString('en')
  }
  catch(err) {
    return "no data"
  }
}
