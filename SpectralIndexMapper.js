var panel = ui.Panel({
  style: {width: '350px'},
  layout: ui.Panel.Layout.flow('vertical'),  
  widgets: [
    ui.Panel([
      ui.Label('Spectral Index Mapper', {fontWeight: 'bold', fontSize: '18px'}),
      ui.Panel({style: {stretch: 'horizontal'}}),  
      ui.Button({
        label: 'Info',
        onClick: function () {
          var infoText = 'author: Stefan Peters (UniSA) May 2025, \n' +
            '------- available indices: -------\n' +
            ' 1) EVI (Enhanced Vegetation Index): Improves on NDVI by reducing atmospheric and soil background effects, useful in dense vegetation.\n' +
            ' 2) FDI (Forest Degradation Index): Highlights forest degradation using Tasseled Cap components.\n' +
            ' 3) GCI (Green Chlorophyll Index): Estimates chlorophyll content in leaves (sensitive to greenness).\n' +
            ' 4) GEMI (Global Environment Monitoring Index): Assesses vegetation while minimizing atmospheric effects (less common than NDVI).\n' +
            ' 5) GNDVI (Green Normalized Difference Vegetation Index): Similar to NDVI but uses green band, better for crops with high chlorophyll.\n' +
            ' 6) NBR (Normalized Burn Ratio): Identifies burned areas and fire severity.\n' +
            ' 7) NBR2 (Normalized Burn Ratio 2): Enhances detection of older burns or low-severity fires.\n' +
            ' 8) NDMI (Normalized Difference Moisture Index): Detects vegetation water content (moisture stress).\n' +
            ' 9) NDRE (Normalized Difference Red Edge Index): Sensitive to chlorophyll content in chlorophyll content in vegetation.\n' +
            ' 10) NDVI (Normalized Difference Vegetation Index): Measures vegetation health and density. High values indicate healthy, dense vegetation.\n' +
            ' 11) SAVI (Soil-Adjusted Vegetation Index): Minimizes soil brightness influence, ideal for sparse vegetation.\n';
          alert('*** GEE Spectral Index Mapper (v1.0) ***\n' + infoText);
        }
      })
    ], ui.Panel.Layout.flow('horizontal', true)),
    ui.Label('App use limited to GTFHG members. User guideline:', {color: 'red', fontSize: '14px', margin: '0px 0px 3px 3px'}),
    ui.Label('https://shorturl.at/KoJPc', {color: 'blue', fontSize: '14px', margin: '2px 0px 6px 3px'}),  
  ]
});
ui.root.widgets().add(panel);

var boxStyle = {width: '80px', margin: '4px 2px 4px 0px'};  

var startYear = ui.Textbox({placeholder: 'Start Year', value: '2024', style: boxStyle});
var startMonth = ui.Textbox({placeholder: 'Start Month', value: '4', style: boxStyle});
var endYear = ui.Textbox({placeholder: 'End Year', value: '2025', style: boxStyle});
var endMonth = ui.Textbox({placeholder: 'End Month', value: '4', style: boxStyle});
var thresholdBox1 = ui.Textbox({placeholder: 'Threshold 1', value: '0', style: boxStyle});
var thresholdBox2 = ui.Textbox({placeholder: 'Threshold 2', value: '0', style: boxStyle});
var roiAssetBox = ui.Textbox({placeholder: 'GEE Asset Path (e.g., projects/...). Click RUN GEE-asset.', value: 'projects/gee-cloud-project-sp/assets/SpectraIndApp/AOI_Nangw5', style: {width: '330px', margin: '2px 0px'}});

var yearInputs = ui.Panel({layout: ui.Panel.Layout.Flow('horizontal'),
  widgets: [ui.Label('Start: year & month', {margin: '10px 6px 10px 10px'}), startYear, startMonth]});

var monthInputs = ui.Panel({layout: ui.Panel.Layout.Flow('horizontal'),
  widgets: [ui.Label('End: year & month', {margin: '10px 6px 10px 15px'}), endYear, endMonth]});

panel.add(yearInputs);
panel.add(monthInputs);

var indexOptions = [
  'EVI', 'FDI', 'GCI', 'GEMI', 'GNDVI', 'NBR', 'NBR2',
  'NDMI', 'NDRE', 'NDVI', 'SAVI'
];

var indexSelector1 = ui.Select({items: indexOptions, value: 'NDVI', style: {margin: '2px'}});
var indexSelector2 = ui.Select({items: indexOptions, value: 'FDI', style: {margin: '2px'}});
var chartCheckbox = ui.Checkbox({label: 'Chart', value: false, style: {margin: '6px 2px 4px 6px'}});
var mapCheckbox = ui.Checkbox({label: 'Map', value: true, style: {margin: '6px'}});

var indexPanel = ui.Panel({
  widgets: [ui.Label('Indices:', {margin: '9px'}), indexSelector1, indexSelector2, chartCheckbox, mapCheckbox],
  layout: ui.Panel.Layout.Flow('horizontal')
});
panel.add(indexPanel);
panel.add(
  ui.Panel([
    ui.Label({
      value: 'Threshold change Index 1: ',  
      style: { fontSize: '14px', fontStyle: 'italic', color: 'grey', margin: '6px 10px'}
    }),
    thresholdBox1
  ], ui.Panel.Layout.Flow('horizontal'))
);
panel.add(
  ui.Panel([
    ui.Label({
      value: 'Threshold change Index 2:',
      style: { fontSize: '14px', fontStyle: 'italic', color: 'grey', margin: '6px 10px'}
    }),
    thresholdBox2
  ], ui.Panel.Layout.Flow('horizontal'))
);

var chartPanel = ui.Panel({style: {margin: '2px 0px'}});
panel.add(chartPanel);

var downloadUIPanel = ui.Panel({layout: ui.Panel.Layout.Flow('vertical'), style: {margin: '2px 0px'}});  
panel.add(downloadUIPanel);

var chartErrorPanel = ui.Panel({style: {margin: '2px 0px'}});  
panel.add(chartErrorPanel);

var inspectorPanel = ui.Panel({
  style: {
    width: '330px',  
    maxHeight: '150px',  
    padding: '2px',  
    border: '1px solid #ccc',  
    margin: '2px 0px'
  },
  layout: ui.Panel.Layout.flow('vertical')
});
panel.add(inspectorPanel);
inspectorPanel.style().set('shown', false);

var drawingTools = Map.drawingTools();
drawingTools.setShown(true);  
drawingTools.setDrawModes(['rectangle', 'polygon']);
drawingTools.layers().reset();  
Map.setCenter(141, -37.5, 9);  

var geometryDrawn = false;
var calculatedIndexCollection1, calculatedIndexCollection2;  

var selectedLayerImage = null;
var selectedLayerName = null;
var mapClickListenerId = null;

// New variable to hold the marker layer
var clickedPointLayer = null;

var runDrawnButton = ui.Button({
  label: 'RUN Geometry',
  style: {stretch: 'horizontal', width: 'auto', margin: '6px', color: 'blue', border: '1px solid blue'},  
  onClick: runAnalysis
});

var runPredefinedButton = ui.Button({
  label: 'RUN GEE-asset',
  style: {stretch: 'horizontal', width: 'auto', margin: '6px', color: 'blue', border: '1px solid blue'},
  onClick: runPredefinedAnalysis
});
runPredefinedButton.setDisabled(false);  

var clearButton = ui.Button({
  label: 'CLEAR',
  style: {stretch: 'horizontal', width: 'auto', margin: '6px', color: 'red', border: '1px solid red'},  
  onClick: clearMap
});

var roiPanel = ui.Panel({layout: ui.Panel.Layout.Flow('vertical'),  
  widgets: [ui.Label('Load GEE-asset:', {fontWeight: 'bold', margin: '2px 0px 2px 4px'}), roiAssetBox]});

panel.add(roiPanel);  
panel.add(ui.Panel({widgets: [runDrawnButton, runPredefinedButton, clearButton], layout: ui.Panel.Layout.Flow('horizontal')}));


function enableRunDrawnButton() {
  runDrawnButton.setDisabled(false);
  runDrawnButton.style().set({ color: 'blue', fontWeight: 'normal', border: '1px solid blue' });
}

function disableRunDrawnButton() {
  runDrawnButton.setDisabled(true);
  runDrawnButton.style().set({ color: 'grey', fontWeight: 'normal', border: '1px solid grey' });
}

function enableClearButton() {
  clearButton.setDisabled(false);
  clearButton.style().set({ color: 'red', border: '1px solid red'});
}

function disableClearButton() {
  clearButton.setDisabled(true);
  clearButton.style().set({ color: 'grey', border: '1px solid grey'});
}

disableRunDrawnButton();
disableClearButton();

drawingTools.onDraw(function(geometry) {  
  geometryDrawn = true;
  enableRunDrawnButton();
  enableClearButton();
});

drawingTools.onEdit(function(geometry, layer) {
  geometryDrawn = true;
  enableRunDrawnButton();
  enableClearButton();
});

function getDrawnGeometry() {
  var layers = drawingTools.layers();
  if (layers.length() > 0) {
    return layers.get(0).getEeObject();
  } else {
    print('No geometry drawn on the map.');
    return null;
  }
}

function maskCloudsStricter(image) {
  var qa60 = image.select('QA60');
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  var qa60Mask = qa60.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa60.bitwiseAnd(cirrusBitMask).eq(0));

  var scl = image.select('SCL');
  var sclCloudMask = scl.neq(3).and(scl.neq(8)).and(scl.neq(9)).and(scl.neq(10));

  var cloudProb = image.select('MSK_CLDPRB');
  var cloudProbThreshold = 65;
  var cloudProbMask = cloudProb.lt(cloudProbThreshold);

  var finalMask = qa60Mask.and(sclCloudMask).and(cloudProbMask);
  return image.updateMask(finalMask).copyProperties(image, ["system:time_start"]);  
}

function tasseledCapS2(img) {  
  var brightness = img.expression(
    '0.3029*BLUE + 0.2786*GREEN + 0.4733*RED + 0.5599*NIR + 0.508*SWIR1 + 0.1872*SWIR2', {
      'BLUE': img.select('B2'), 'GREEN': img.select('B3'), 'RED': img.select('B4'),
      'NIR': img.select('B8'), 'SWIR1': img.select('B11'), 'SWIR2': img.select('B12')
    }).rename('brightness');
  var greenness = img.expression(
    '-0.2941*BLUE - 0.243*GREEN - 0.5424*RED + 0.7276*NIR + 0.0713*SWIR1 - 0.1608*SWIR2', {
      'BLUE': img.select('B2'), 'GREEN': img.select('B3'), 'RED': img.select('B4'),
      'NIR': img.select('B8'), 'SWIR1': img.select('B11'), 'SWIR2': img.select('B12')
    }).rename('greenness');
  var wetness = img.expression(
    '0.1511*BLUE + 0.1973*GREEN + 0.3283*RED + 0.3407*NIR - 0.7117*SWIR1 - 0.4559*SWIR2', {
      'BLUE': img.select('B2'), 'GREEN': img.select('B3'), 'RED': img.select('B4'),
      'NIR': img.select('B8'), 'SWIR1': img.select('B11'), 'SWIR2': img.select('B12')
    }).rename('wetness');
  return img.addBands([brightness, greenness, wetness]);
}

function calculateIndex(image, index) {
  var b2 = image.select('B2'); var b3 = image.select('B3'); var b4 = image.select('B4');
  var b5 = image.select('B5'); var b8 = image.select('B8'); var b11 = image.select('B11');
  var b12 = image.select('B12');
  var image_scaled = image.divide(10000);

  var indexImage;
  switch (index) {
    case 'EVI': indexImage = image_scaled.expression('2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {NIR: image_scaled.select('B8'), RED: image_scaled.select('B4'), BLUE: image_scaled.select('B2')}).rename('EVI'); break;
    case 'FDI':
      var tct = tasseledCapS2(image_scaled);  
      indexImage = tct.expression('B - (G + W)', {B: tct.select('brightness'), G: tct.select('greenness'), W: tct.select('wetness')}).rename('FDI');
      break;
    case 'GCI': indexImage = image_scaled.expression('(NIR / GREEN) - 1', {NIR: image_scaled.select('B8'), GREEN: image_scaled.select('B3')}).rename('GCI'); break;
    case 'GEMI': indexImage = image_scaled.expression(
        '((2*(NIR*NIR - RED*RED) + 1.5*NIR + 0.5*RED)/(NIR + RED + 0.5)) * (1 - 0.25*((2*(NIR*NIR - RED*RED) + 1.5*NIR + 0.5*RED)/(NIR + RED + 0.5))) - ((RED - 0.125)/(1 - RED))',
        {NIR: image_scaled.select('B8'), RED: image_scaled.select('B4')}).rename('GEMI'); break;
    case 'GNDVI': indexImage = image.normalizedDifference(['B8', 'B3']).rename('GNDVI'); break;  
    case 'NBR': indexImage = image.normalizedDifference(['B8', 'B12']).rename('NBR'); break;
    case 'NBR2': indexImage = image.normalizedDifference(['B11', 'B12']).rename('NBR2'); break;
    case 'NDMI': indexImage = image.normalizedDifference(['B8', 'B11']).rename('NDMI'); break;
    case 'NDRE': indexImage = image.normalizedDifference(['B8', 'B5']).rename('NDRE'); break;
    case 'NDVI': indexImage = image.normalizedDifference(['B8', 'B4']).rename('NDVI'); break;
    case 'SAVI': indexImage = image_scaled.expression('((NIR - RED) / (NIR + RED + 0.5)) * 1.5', {NIR: image_scaled.select('B8'), RED: image_scaled.select('B4')}).rename('SAVI'); break;
    default: indexImage = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  }
  return indexImage.copyProperties(image, image.propertyNames());
}

function clearDownloadUI() {
  downloadUIPanel.clear();
  selectedLayerImage = null;
  selectedLayerName = null;
}

var handleMapClick = function(coords) {
  if (!inspectorPanel.style().get('shown')) {
    // If inspector panel is not shown, remove the marker if it exists
    if (clickedPointLayer) {
      Map.layers().remove(clickedPointLayer);
      clickedPointLayer = null;
    }
    return;
  }

  inspectorPanel.clear();
  inspectorPanel.add(ui.Label('Fetching pixel data...', {margin: '2px 0', color: 'green'}));
  inspectorPanel.add(ui.Label('Lat: ' + coords.lat.toFixed(5) + ', Lon: ' + coords.lon.toFixed(5), {margin: '2px 0', color: 'green'}));

  var clickedPoint = ee.Geometry.Point(coords.lon, coords.lat);

  // Add or update the marker on the map
  if (clickedPointLayer) {
    clickedPointLayer.setEeObject(clickedPoint);
  } else {
    clickedPointLayer = ui.Map.Layer(clickedPoint, {color: 'red', pointSize: 8, strokeWidth: 1, strokeColor: 'white'}, 'Clicked Point');
    Map.layers().add(clickedPointLayer);
  }


  if (selectedLayerImage && selectedLayerName) {
    inspectorPanel.add(ui.Label('Inspecting: ' + selectedLayerName, {fontWeight: 'bold', margin: '2px 0', color: 'green'}));
    var imageToSample = selectedLayerImage;
    var scale = Map.getScale();  

    // Use a deferred evaluation for the sample to avoid blocking the UI
    imageToSample.sample({ region: clickedPoint, scale: scale, numPixels: 1, geometries: false })
      .first()
      .evaluate(function(result, error) {
        inspectorPanel.remove(inspectorPanel.widgets().get(0));  
        if (error) {
          inspectorPanel.add(ui.Label('Error sampling: ' + error, {color: 'red', margin: '2px 0'}));
          print('Sampling error:', error);
          return;
        }
        if (result && result.properties) {
          var bandNames = Object.keys(result.properties);
          if (bandNames.length === 0) {
            inspectorPanel.add(ui.Label('No data/bands at this point for ' + selectedLayerName + '.', {margin: '2px 0'}));
          } else {
            bandNames.forEach(function(bandName) {
              var value = result.properties[bandName];
              inspectorPanel.add(ui.Label(bandName + ': ' + (typeof value === 'number' ? value.toFixed(4) : value), {margin: '2px 0', color: 'green'}));
            });
          }
        } else {
          inspectorPanel.add(ui.Label('No data at this point for ' + selectedLayerName + '.', {margin: '2px 0'}));
        }
      });
  } else {
    inspectorPanel.clear();  
    inspectorPanel.add(ui.Label('Lat: ' + coords.lat.toFixed(5) + ', Lon: ' + coords.lon.toFixed(5), {margin: '2px 0', color: 'green'}));
    inspectorPanel.add(ui.Label('Select a map layer from the dropdown above to inspect its values.', {margin: '2px 0', color: 'green'}));
  }
};

function runAnalysis() {
  var geometry = getDrawnGeometry();
  if (!geometry) {
    chartErrorPanel.clear();
    chartErrorPanel.add(ui.Label('Please draw/define a Region of Interest (ROI) first.', {color: 'red'}));
    print("runAnalysis: getDrawnGeometry() reported no geometry. Ensure drawing is complete and registered.");  
    return;
  }
  Map.layers().reset();

  Map.drawingTools().layers().reset();

  chartPanel.clear();
  chartErrorPanel.clear();  
  clearDownloadUI();
  inspectorPanel.clear();
  inspectorPanel.style().set('shown', false);
  if (mapClickListenerId) {
      Map.unlisten(mapClickListenerId);
      mapClickListenerId = null;
  }
  // Clear the marker when a new analysis run begins
  if (clickedPointLayer) {
    Map.layers().remove(clickedPointLayer);
    clickedPointLayer = null;
  }

  processData(geometry);
}

function runPredefinedAnalysis() {
  Map.layers().reset(); Map.drawingTools().layers().reset();
  chartPanel.clear(); chartErrorPanel.clear(); clearDownloadUI();
  inspectorPanel.clear(); inspectorPanel.style().set('shown', false);

  // Clear the marker when a new analysis run begins
  if (clickedPointLayer) {
    Map.layers().remove(clickedPointLayer);
    clickedPointLayer = null;
  }

  var roiAssetPath = roiAssetBox.getValue();
  if (!roiAssetPath || roiAssetPath.trim() === '') {
    chartErrorPanel.add(ui.Label('GEE Asset path is empty. Please provide a valid asset path.', {color: 'red'}));
    return;
  }
  try {
    var predefinedGeometry = ee.FeatureCollection(roiAssetPath).geometry();
    // No need for getInfo() here, let it be an EE object
    print('Successfully loaded GEE Asset: ', roiAssetPath);
    processData(predefinedGeometry);
  } catch (error) {
    print('Error loading GEE asset: ' + roiAssetPath + '. Details: ', error);
    chartErrorPanel.add(ui.Label('Error loading GEE asset. Check path, permissions, and console for details.', {color: 'red'}));
  }
}

function processData(geometry) {
  chartErrorPanel.clear();  
  var yearStart = parseInt(startYear.getValue(), 10);
  var monthStart = parseInt(startMonth.getValue(), 10);
  var yearEnd = parseInt(endYear.getValue(), 10);
  var monthEnd = parseInt(endMonth.getValue(), 10);

  if (isNaN(yearStart) || isNaN(monthStart) || isNaN(yearEnd) || isNaN(monthEnd) ||
      monthStart < 1 || monthStart > 12 || monthEnd < 1 || monthEnd > 12) {
    chartErrorPanel.add(ui.Label('Invalid date inputs. Month must be 1-12.', {color: 'red'})); return;
  }
  var collectionStartDate = ee.Date.fromYMD(yearStart, monthStart, 1);
  var collectionEndDate = ee.Date.fromYMD(yearEnd, monthEnd, 1).advance(1, 'month').advance(-1, 'day');

  // Use evaluate to compare dates, but only when necessary
  ee.List([collectionStartDate.millis(), collectionEndDate.millis()]).evaluate(function(dates, error){
    if (error) {
      chartErrorPanel.add(ui.Label('Error checking dates: ' + error, {color: 'red'}));
      return;
    }
    if (dates[0] >= dates[1]) {
      chartErrorPanel.add(ui.Label('Start date must be before end date.', {color: 'red'})); return;
    }

    var threshold1 = parseFloat(thresholdBox1.getValue());
    var threshold2 = parseFloat(thresholdBox2.getValue());
    var index1 = indexSelector1.getValue();
    var index2 = indexSelector2.getValue();

    Map.centerObject(geometry, 10);

    var allImages = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(geometry)
      .filterDate(collectionStartDate, collectionEndDate)  
      .map(maskCloudsStricter);

    calculatedIndexCollection1 = allImages.map(function(image) { return calculateIndex(image, index1); });
    calculatedIndexCollection2 = allImages.map(function(image) { return calculateIndex(image, index2); });

    var compositePeriodMonths = 2;

    var startCompositeDateStart = collectionStartDate;
    var rawStartCompositeDateEnd = collectionStartDate.advance(compositePeriodMonths, 'month');
    
    // Clamp startCompositeDateEnd to be within the overall collection period
    var startCompositeDateEnd = ee.Date(ee.Algorithms.If(
      rawStartCompositeDateEnd.millis().gt(collectionEndDate.millis()), // CORRECTED: Compare millis()
      collectionEndDate,
      rawStartCompositeDateEnd
    ));
    // Ensure startCompositeDateEnd is at least 1 day after startCompositeDateStart
    startCompositeDateEnd = ee.Date(ee.Algorithms.If(
      startCompositeDateEnd.millis().lt(startCompositeDateStart.advance(1, 'day').millis()), // CORRECTED: Compare millis()
      startCompositeDateStart.advance(1, 'day'),
      startCompositeDateEnd
    ));


    var endCompositeDateEnd = collectionEndDate;
    var rawEndCompositeDateStart = collectionEndDate.advance(-compositePeriodMonths, 'month');

    // Clamp endCompositeDateStart to be within the overall collection period
    var endCompositeDateStart = ee.Date(ee.Algorithms.If(
      rawEndCompositeDateStart.millis().lt(collectionStartDate.millis()), // CORRECTED: Compare millis()
      collectionStartDate,
      rawEndCompositeDateStart
    ));
    // Ensure endCompositeDateStart is at least 1 day before endCompositeDateEnd
    endCompositeDateStart = ee.Date(ee.Algorithms.If(
      endCompositeDateStart.millis().gt(endCompositeDateEnd.advance(-1, 'day').millis()), // CORRECTED: Compare millis()
      endCompositeDateEnd.advance(-1, 'day'),
      endCompositeDateStart
    ));

    // Evaluate dates for printing, but not for core logic
    ee.List([startCompositeDateStart.format('YYYY-MM-dd'), startCompositeDateEnd.format('YYYY-MM-dd'),
              endCompositeDateStart.format('YYYY-MM-dd'), endCompositeDateEnd.format('YYYY-MM-dd')]).evaluate(function(dates, error) {
      if (error) {
        print('Error evaluating composite dates for printing:', error);
        return;
      }
      print('Start Composite Period:', dates[0], 'to', dates[1]);
      print('End Composite Period:', dates[2], 'to', dates[3]);
      
      var startComp1 = calculatedIndexCollection1.filterDate(startCompositeDateStart, startCompositeDateEnd).median();
      var endComp1 = calculatedIndexCollection1.filterDate(endCompositeDateStart, endCompositeDateEnd).median();
      var startComp2 = calculatedIndexCollection2.filterDate(startCompositeDateStart, startCompositeDateEnd).median();
      var endComp2 = calculatedIndexCollection2.filterDate(endCompositeDateStart, endCompositeDateEnd).median();
      var startRGBImg = allImages.filterDate(startCompositeDateStart, startCompositeDateEnd).median().clip(geometry);
      var endRGBImg = allImages.filterDate(endCompositeDateStart, endCompositeDateEnd).median().clip(geometry);

      var visFDI = {min: -0.5, max: 0.5, palette: ['red', 'white', 'blue']};
      var visIndex = {min: -1, max: 1, palette: ['#d7191c', '#fdae61', '#ffffbf', '#abdda4', '#2b83ba'].reverse()};
      var visRGB = {min: 0, max: 3000, gamma: 1.3, bands: ['B4', 'B3', 'B2']};
      var visDiff = {min: -0.5, max: 0.5, palette: ['#d73027', '#fc8d59', '#fee08b', '#ffffbf', '#d9ef8b', '#91cf60', '#1a9850'].reverse()};
      var visBinary = {min: 0, max: 1, palette: ['lightgreen', 'orangered']};

      var layerOptions = [];
      var layerImages = {};
      Map.layers().reset();
      if (Map.drawingTools().layers().length() > 0) Map.drawingTools().layers().get(0).setShown(false);

      if (mapCheckbox.getValue()) {
        // Date strings are now available from the evaluate callback
        var sDateStr = dates[0].substring(2,7); // Extract YY-MM from YYYY-MM-DD
        var eDateStr = dates[3].substring(2,7);

        Map.addLayer(startRGBImg, visRGB, 'Start RGB ' + sDateStr, false);
        layerOptions.push('Start RGB ' + sDateStr); layerImages['Start RGB ' + sDateStr] = startRGBImg.select(['B4', 'B3', 'B2'], ['R', 'G', 'B']);
        Map.addLayer(endRGBImg, visRGB, 'End RGB ' + eDateStr, true);
        layerOptions.push('End RGB ' + eDateStr); layerImages['End RGB ' + eDateStr] = endRGBImg.select(['B4', 'B3', 'B2'], ['R', 'G', 'B']);

        var currentVis1 = (index1 === 'FDI') ? visFDI : visIndex;
        Map.addLayer(startComp1.clip(geometry), currentVis1, 'Start ' + index1 + ' ' + sDateStr, false);
        layerOptions.push('Start ' + index1 + ' ' + sDateStr); layerImages['Start ' + index1 + ' ' + sDateStr] = startComp1.clip(geometry);
        Map.addLayer(endComp1.clip(geometry), currentVis1, 'End ' + index1 + ' ' + eDateStr, false);
        layerOptions.push('End ' + index1 + ' ' + eDateStr); layerImages['End ' + index1 + ' ' + eDateStr] = endComp1.clip(geometry);

        if (index1 !== index2) {
          var currentVis2 = (index2 === 'FDI') ? visFDI : visIndex;
          Map.addLayer(startComp2.clip(geometry), currentVis2, 'Start ' + index2 + ' ' + sDateStr, false);
          layerOptions.push('Start ' + index2 + ' ' + sDateStr); layerImages['Start ' + index2 + ' ' + sDateStr] = startComp2.clip(geometry);
          Map.addLayer(endComp2.clip(geometry), currentVis2, 'End ' + index2 + ' ' + eDateStr, false);
          layerOptions.push('End ' + index2 + ' ' + eDateStr); layerImages['End ' + index2 + ' ' + eDateStr] = endComp2.clip(geometry);
        }

        var relativeChange1 = endComp1.subtract(startComp1).divide(startComp1.abs().max(ee.Image(0.001))).rename(index1 + '_RelChange');
        Map.addLayer(relativeChange1.clip(geometry), visDiff, index1 + ' Rel. Change', false);
        layerOptions.push(index1 + ' Rel. Change'); layerImages[index1 + ' Rel. Change'] = relativeChange1.clip(geometry);
        var binaryChange1 = relativeChange1.lt(threshold1).rename(index1 + '_Binary');
        Map.addLayer(binaryChange1.clip(geometry), visBinary, index1 + ' Binary (<' + threshold1 + ')', false);
        layerOptions.push(index1 + ' Binary (<' + threshold1 + ')'); layerImages[index1 + ' Binary (<' + threshold1 + ')'] = binaryChange1.clip(geometry);

        if (index1 !== index2) {
          var relativeChange2 = endComp2.subtract(startComp2).divide(startComp2.abs().max(ee.Image(0.001))).rename(index2 + '_RelChange');
          Map.addLayer(relativeChange2.clip(geometry), visDiff, index2 + ' Rel. Change', false);
          layerOptions.push(index2 + ' Rel. Change'); layerImages[index2 + ' Rel. Change'] = relativeChange2.clip(geometry);
          var binaryChange2 = relativeChange2.lt(threshold2).rename(index2 + '_Binary');
          Map.addLayer(binaryChange2.clip(geometry), visBinary, index2 + ' Binary (<' + threshold2 + ')', false);
          layerOptions.push(index2 + ' Binary (<' + threshold2 + ')'); layerImages[index2 + ' Binary (<' + threshold2 + ')'] = binaryChange2.clip(geometry);
        }

        clearDownloadUI();
        var layerSelectLabel = ui.Label('Inspect/Download Layer:', {fontWeight: 'bold', margin: '2px 0 2px 0'});
        var layerDropdown = ui.Select({
          items: layerOptions, placeholder: 'Select map layer', style: {width: '320px', margin: '2px 0 2px 8px'},
          onChange: function(selectedKey) {
            selectedLayerName = selectedKey; selectedLayerImage = layerImages[selectedKey] || null;
            downloadButton.setDisabled(!selectedLayerImage);
            if (inspectorPanel.style().get('shown')) { inspectorPanel.clear();
              inspectorPanel.add(ui.Label(selectedKey ? 'Click map to inspect: ' + selectedKey : 'Select a layer, then click map.', {margin: '2px 0', color: 'green'}));
            }
          }
        });
        var downloadButtonLabel = 'Download Selected Layer (GeoTIFF)';
        var downloadButton = ui.Button({
          label: downloadButtonLabel, disabled: true, style: {width: '320px'},
          onClick: function() {
            if (!selectedLayerImage || !selectedLayerName) { print('No layer selected for download.'); return; }
            downloadButton.setLabel('Generating URL...').setDisabled(true);
            var downloadMsgPanel = ui.Panel([ui.Label('Preparing: ' + selectedLayerName, {margin: '2px 0'})]);
            downloadUIPanel.add(downloadMsgPanel);  
            var filename = selectedLayerName.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/\s+/g, '_');
            selectedLayerImage.getDownloadURL({
              name: filename, scale: 30, crs: 'EPSG:4326', region: geometry.bounds()
            }, function(url, error) {
              downloadButton.setLabel(downloadButtonLabel).setDisabled(!selectedLayerImage);  
                downloadMsgPanel.clear();
              if (error) { downloadMsgPanel.add(ui.Label('Error: ' + error, {color: 'red'})); print('Download error:', error); }
              else if (url) {
                var successMsg = ui.Label('Link ready. If download doesn\'t start, copy URL.', {color: 'green', margin: '2px 0'});
                var urlLabel = ui.Label(url, { stretch: 'horizontal', margin: '2px 0'});
                var clickLink = ui.Label('Click here to Download', {color: 'blue', margin: '2px 0'}).setUrl(url);
                downloadMsgPanel.add(ui.Panel([successMsg, urlLabel, clickLink], ui.Panel.Layout.flow('vertical')));
                print(selectedLayerName + ' Download URL:', url);
              }
              else { downloadMsgPanel.add(ui.Label('Download URL was null.', {color: 'orange'})); }
            });
          }
        });
        downloadUIPanel.add(layerSelectLabel).add(layerDropdown).add(downloadButton);
        
        inspectorPanel.style().set('shown', true); inspectorPanel.clear();
        //inspectorPanel.style({color: 'red'})
        inspectorPanel.add(ui.Label('Select layer from dropdown, then click map to inspect.', {fontSize: '13px', fontStyle: 'italic', color: 'green', margin: '2px 0'}));

        if (mapClickListenerId) Map.unlisten(mapClickListenerId);
        var debouncedActualHandler = ui.util.debounce(handleMapClick, 300);
        mapClickListenerId = Map.onClick(debouncedActualHandler);
      } else {
        clearDownloadUI(); inspectorPanel.style().set('shown', false); inspectorPanel.clear();
        if (mapClickListenerId) { Map.unlisten(mapClickListenerId); mapClickListenerId = null; }
        // Remove the marker if map checkbox is unchecked
        if (clickedPointLayer) {
          Map.layers().remove(clickedPointLayer);
          clickedPointLayer = null;
        }
      }

      if (chartCheckbox.getValue()) {
        drawChart(geometry, index1, index2, calculatedIndexCollection1, calculatedIndexCollection2);
      }
      enableClearButton();
    });
  });
}

function drawChart(geometry, index1, index2, coll1, coll2) {
  chartPanel.clear(); chartErrorPanel.clear();
  // Evaluate the area once, or if it's too slow, consider a smaller default scale
  // and only adjust if the user explicitly asks for higher resolution chart data.
  geometry.area({'maxError': 1000}).evaluate(function(roiArea, error){
    if (error) {
      chartErrorPanel.add(ui.Label('Error calculating ROI area: ' + error, {color: 'red'}));
      return;
    }

    var scaleForChart = 30;
    if (roiArea > 5e9) { chartErrorPanel.add(ui.Label('ROI too large for chart (>5000km²).', {color:'red'})); return; }
    else if (roiArea > 1e9) { scaleForChart = 500; } else if (roiArea > 1e8) { scaleForChart = 200; }
    else if (roiArea > 1e7) { scaleForChart = 100; } else if (roiArea > 1e6) { scaleForChart = 50; }
    print('Chart scale:', scaleForChart, 'm for ROI area:', (roiArea/1e6).toFixed(1), 'km²');

    var chartCollections = [];
    var seriesOpts = {}; var seriesCount = 0;
    if (index1) { chartCollections.push(coll1.select([index1])); seriesOpts[seriesCount++] = {color: 'green', labelInLegend: index1}; }
    if (index1 !== index2 && index2) { chartCollections.push(coll2.select([index2])); seriesOpts[seriesCount++] = {color: 'blue', labelInLegend: index2}; }
    if (chartCollections.length === 0) { chartErrorPanel.add(ui.Label('No indices for chart.', {color:'orange'})); return; }

    var finalCollection = chartCollections.length > 1 ? ee.ImageCollection(chartCollections[0].merge(chartCollections[1])) : ee.ImageCollection(chartCollections[0]);
    var chart = ui.Chart.image.series({
      imageCollection: finalCollection, region: geometry, reducer: ee.Reducer.mean(),
      scale: scaleForChart, xProperty: 'system:time_start'
    }).setOptions({
      title: 'Time Series: ' + index1 + (index1 !== index2 && index2 ? ' & ' + index2 : ''),
      hAxis: {title: 'Date', format: 'MMMYYYY'}, vAxis: {title: 'Index Value (Mean)'},
      lineWidth: 1.5, pointSize: 3, series: seriesOpts, interpolateNulls: true,
      explorer: {axis:'horizontal', actions: ['dragToZoom', 'rightClickToReset']}
    });
    chartPanel.add(chart);
  });
}

function clearMap() {
  Map.layers().reset(); Map.drawingTools().layers().reset();
  chartPanel.clear(); chartErrorPanel.clear(); clearDownloadUI();
  inspectorPanel.clear(); inspectorPanel.style().set('shown', false);
  if (mapClickListenerId) { Map.unlisten(mapClickListenerId); mapClickListenerId = null; }
  geometryDrawn = false;
  disableRunDrawnButton(); disableClearButton();
  // Remove the clicked point marker
  if (clickedPointLayer) {
    Map.layers().remove(clickedPointLayer);
    clickedPointLayer = null;
  }

  print('Map and UI cleared.');
}

function pad(number) { return (number < 10) ? '0' + number : String(number); }

Map.style().set('cursor', 'crosshair');