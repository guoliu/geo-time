function clockFace(parentSvg, data, colormap) {
  var outerRadius = 320,
  innerRadius = 205,
  gap = 2,
  nCircle = 5,
  colors = colormap.range();

  ids = [],
  sortIds = [-1],
  layers = d3.map([]);

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

  parentSvg.selectAll(".time-layer").remove();
  
  var clock = parentSvg.append("g")
  .attr("id","clock-group")
  .attr("transform", "translate(" 
    + parseInt(parentSvg.style("width").slice(0, -2)) / 2 + "," 
    + parseInt(parentSvg.style("height").slice(0, -2)) / 2 + ")");

  var refer = parentSvg.append("g")
  .attr("id","reference-group")
  .attr("transform", "translate(" 
    + parseInt(parentSvg.style("width").slice(0, -2)) / 2 + "," 
    + parseInt(parentSvg.style("height").slice(0, -2)) / 2 + ")");

  this.update = function(id) {
    // if duplicate
    if (ids.indexOf(id)>-1) return;

    // add and sort new added id
    if (id!=-1) ids.push(id);
    if (ids.length>(nCircle-1)) ids.shift();
    sortIds = $.extend([], ids);
    sortIds.push(-1);
    sortIds.sort(function(id1, id2){
      return data.get(id1).data.get(endYear-10).value - data.get(id2).data.get(endYear-10).value}
    );

    var bandwidth = (outerRadius - innerRadius - gap*ids.length)/(ids.length+1);
    
    //clock.selectAll(".clock-face").remove();
    sortIds.forEach(function(id, index) {
      var d = data.get(id),
      name = d.name,
      y0 = innerRadius + index*(bandwidth+gap);

      area.innerRadius(y0);

      // compute data if not exists
      if (!layers.has(id)) {
        var dataTemp = [];
        for (var y = startYear; y <= endYear; y++) {
          if (d.data.has(y)) {
            dataTemp.push({year: y, value: d.data.get(y).value});
          }
          else {
            dataTemp.push({year: y, value: 0});
          }
        };
        layers.set(id, {data: dataTemp, name: d.name});
      }

      // create or update
      colors.forEach(function(color) {
        radius.range([y0, y0 + bandwidth])
          .domain(colormap.invertExtent(color));
        node = d3.select("#c"+id+"-c"+color.slice(1));
        if (node.empty()) { 
          clock.append("path")
          .attr("id", "c"+id+"-c"+color.slice(1))
          .attr("d", area(layers.get(id).data))
          .attr("class", "clock-face")
          .attr("fill", color);
        }
        else {
          node.transition().attr("d", area(layers.get(id).data));
        }
      });
    });
}
this.update(-1);

  // invert mouseover position
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

 var base = refer
 .append("path")
 .attr("class", "base-layer")
 .attr("id", "base")
 .attr("d", base_arc)
 .attr("fill", "transparent");

  base.on('mousemove', function () {
    // clean previous
    refer.selectAll(".clock-hover").remove();

    // get mouse postion and angle
    cord = d3.mouse(this);
    r_angle = invertCord(cord);
    r_year = Math.round(angle.invert(r_angle));

    // add ruler
    refer
    .append("path")
    .attr("id", "hover-ruler")
    .attr("class", "clock-hover")
    .attr("fill", "black")
    .attr('stroke', "black")
    .attr('stroke-width', 1)
    .attr("d", d3.svg.line.radial()([[innerRadius, angle(r_year)], [outerRadius, angle(r_year)]]));

    // add year 
    refer
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
    sortIds.forEach(function(id, index) {
      var bandwidth = (outerRadius - innerRadius - gap*ids.length)/(ids.length+1),
      r = innerRadius + index*bandwidth + index*gap;
      refer
      .append("text")
      .attr("class", "clock-hover")
      .attr("id", "hover-year")
      .attr("transform", function(d) {
        return "translate(" + Math.sin(angle(r_year))*r*1.01
          + ", " + (- Math.cos(angle(r_year))*r*1.01) + ")" 
      + "rotate(" + angle(r_year)*180/Math.PI + ")" 
    })
      .text(data.get(id).name)
      .attr("text-anchor", "end");

      refer
      .append("text")
      .attr("class", "clock-hover")
      .attr("id", "hover-year")
      .attr("transform", function(d) {
        return "translate(" + Math.sin(angle(r_year))*r*1.01
          + ", " + (- Math.cos(angle(r_year))*r*1.01) + ")" 
      + "rotate(" + angle(r_year)*180/Math.PI + ")" })
      .text(get_value_str(data, id, r_year))
      .attr("text-anchor", "start");
    });
  })
.on('mouseout', function () {
  refer.selectAll(".clock-hover").remove();
});

this.hand = function(year) {
  refer.selectAll(".clock-hand").remove();
     // add ruler
     refer
     .append("path")
     .attr("id", "hand-ruler")
     .attr("class", "clock-hand")
     .attr("fill", "black")
     .attr('stroke', "black")
     .attr('stroke-width', 1)
     .attr("d", d3.svg.line.radial()([[innerRadius, angle(year)], [outerRadius, angle(year)]]));

    // add year 
    refer
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
  };

}