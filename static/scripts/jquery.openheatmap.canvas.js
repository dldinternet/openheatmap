/**
 * This script provides the interface to the OpenHeatMap rendering component
 *
 * To use it, call $('#yourelement').insertOpenHeatMap({ width: 800, height:400}) to add the
 * component to your page, and then call getOpenHeatMap() to grab the API
 * object to continue construction
 *
 *
 **/

g_openHeatMapObjects = {};

(function($) {
 
    $.fn.insertOpenHeatMap = function(settings) {
        var defaults = {
            source: 'http://static.openheatmap.com.s3.amazonaws.com/openheatmap.swf',
            mapName: 'openheatmap',
            width: 800,
            height: 600
        };
 
        if (settings) 
            settings = $.extend(defaults, settings);
        else
            settings = defaults;
 
        this.each(function() {

            $(this).empty();

			var canvas = $(
                '<canvas '
                +'width="'+settings.width+'" '
                +'height="'+settings.height+'"'
                +'id="'+settings.mapName+'_canvas"'
                +'"></canvas>'
            );

            var openHeatMap = new OpenHeatMap(canvas);
            
            openHeatMap.setSize(settings.width, settings.height);

            g_openHeatMapObjects[settings.mapName] = openHeatMap;

            $(this).append(canvas);
            
            onMapCreated();
        });
 
        return this;
    };
    
    $.getOpenHeatMap = function(mapName) {
        if (!mapName)
            mapName = 'openheatmap';
            
        return g_openHeatMapObjects[mapName];
    };
 
})(jQuery);

function OpenHeatMap(canvas)
{
    this.__constructor = function(canvas)
    {
        this.initializeMembers();

        this.setSize(800, 600);

        this.createViewerElements();

        this.setLatLonViewingArea(80, -180, -75, 180);

        this._canvas = canvas;

        this._canvas
        .bind('click', this, this.mapMouseClickHandler)
        .bind('dblclick', this, this.mapMouseDoubleClickHandler)
        .bind('mousedown', this, this.mapMouseDownHandler)
        .bind('mousemove', this, this.mapMouseMoveHandler)
        .bind('mouseout', this, this.mapMouseOutHandler)
        .bind('mouseover', this, this.mapMouseOverHandler)
        .bind('mouseup', this, this.mapMouseUpHandler);

        _dirty = true;

        var instance = this;

        window.setInterval(function() { instance.doEveryFrame(); }, 30);
    };
    
    this.initializeMembers = function() {
    
        this._mainCanvas = null;
        this._dirty = true;
        this._redrawCountdown = 0;

        this._wayDefaults = {
            color: 0x000000,
            alpha: 1.0,
            line_thickness: 0
        };

        this._colorGradient = [
            {alpha: 0x00, red: 0x00, green: 0xb0, blue: 0x00},
            {alpha: 0x7f, red: 0xe0, green: 0xe0, blue: 0x00},
            {alpha: 0xff, red: 0xff, green: 0x00, blue: 0x00},
        ];

        this._onClickFunction = null;
        this._onDoubleClickFunction = null;
        this._onMouseDownFunction = null;
        this._onMouseUpFunction = null;
        this._onMouseOverFunction = null;
        this._onMouseOutFunction = null;
        this._onMouseMoveFunction = null;
        this._onFrameRenderFunction = null;
        this._onDataChangeFunction = null;
        this._onWaysLoadFunction = null;
        this._onValuesLoadFunction = null;
        this._onErrorFunction = null;
        this._onViewChangeFunction = null;

        this._nodes = {};
        this._ways = {};

        this._waysLoader;
        this._waysFileName = "";

        this._valuesLoader;
        this._valuesFileName = "";

        this._valueHeaders = null;
        this._valueData = null;
        this._timeColumnIndex;
        this._valueColumnIndex;

        this._smallestValue;
        this._largestValue;

        this._hasTime = false;
        this._frameTimes = [];
        this._frameIndex = 0;

        this._tagMap = {};

        this._latLonToXYMatrix = new Matrix();
        this._xYToLatLonMatrix = new Matrix();

        this._worldBoundingBox = new Rectangle();
        this._waysGrid = null;

        this._timelineControls = null;

        this._inlays = [];

        this._valuesDirty = false;

        this._mainBitmapTopLeftLatLon = null;
        this._mainBitmapBottomRightLatLon = null;

        this._isDragging = false;
        this._lastDragPosition = null;
        this._lastClickTime = 0;

        this._zoomSlider = null;

        this._foundTimes = {};

        this._hasBitmapBackground = false;

        this._hasPointValues = false;
        this._latitudeColumnIndex = -1;
        this._longitudeColumnIndex = -1;

        this._pointsGrid = null;

        this._mapTiles = {};

        this._settings = {
            width: 800,
            height: 600,
            zoom_slider_power: 5.0,
            zoomed_out_degrees_per_pixel: -180,
            zoomed_in_degrees_per_pixel: -0.01,
            is_gradient_value_range_set: false,
            gradient_value_min: 0,
            gradient_value_max: 0,
            point_blob_radius: 0.001,
            point_blob_value: 1.0,
            credit_text: '<a href="http://openheatmap.com"><u>OpenHeatMap</u></a>',
            credit_color: '0x303030',
            title_text: '',
            title_size: 15,
            title_color: '0x000000',
            title_background_color: '0xd0e0ff',
            title_background_alpha: 1.0,
            time_range_start: null,
            time_range_end: null,
            force_outlines: false,
            show_map_tiles: false,
            map_server_root: 'http://a.tile.openstreetmap.org/',
            map_tile_width: 256,
            map_tile_height: 256,
            map_tile_origin_lat: 85.05112877980659,
            map_tile_origin_lon: -180,
            map_tile_match_factor: 1.2,
            world_lat_height: -170.102258,
            world_lon_width: 360,
            inlay_border_color: 0x000000,
            ocean_color: 0xd0e0ff,
            information_alpha: 1.0,
            is_point_blob_radius_in_pixels: false,
            point_bitmap_scale: 2,
            tab_height: 15
        };

        this._lastSetWayIds = {};

        this._credit = null;
        this._title = null;

        this._popups = [];

        this._informationLayerCanvas = null;

        this._mapTilesDirty = true;
	
        this._tabColumnIndex = -1;
        this._hasTabs = false;
        this._tabNames = [];
        this._tabInfo = {};
        this._selectedTabIndex = 0;
        this._hoveredTabIndex = -1;
	
        this._pointBlobBitmap = null;
        this._pointBlobBitmapWidth = 0;
        this._pointBlobBitmapHeight = 0;
        this._pointBlobTileX = 0;
        this._pointBlobTileY = 0;
        this._pointBlobStillRendering = false;    
    };

    this.beginDrawing = function(canvas) {
        if (!canvas)
            canvas = this._canvas;
            
        var context = canvas.get(0).getContext('2d');
        context.save();
        return context;
    };

    this.endDrawing = function(context) {
        context.restore();
    };

    this.redraw = function() {
        this.clearCanvas(this._canvas);
        
        this.drawWays(this._canvas, this._latLonToXYMatrix); 
    };
    
    this.getLocalPosition = function(element, pageX, pageY) {
        var elementPosition = element.elementLocation();

        var result = new Point(
            (pageX-elementPosition.x),
            (pageY-elementPosition.y)
        );

        return result;
    };

    this.clearCanvas = function(canvas) {
        var context = this.beginDrawing(canvas);
        
        context.clearRect(0, 0, this._settings.width, this._settings.height);
        
        this.endDrawing(context);
    };
    
    this.testDrawWays = function(canvas, latLonToXYMatrix) {
    
        var context = this.beginDrawing(canvas);
        
        var style = '#000000';
        
        context.fillStyle = style;
        context.strokeStyle = style;

        context.beginPath();
        
        for (wayId in this._ways)
        {
            var way = this._ways[wayId];

            if (way.nds.length<1)
                continue;
            
            var firstNd = way.nds[0];
            var firstNode = this._nodes[firstNd];
                
            var firstPos = this.getXYFromLatLon(firstNode, latLonToXYMatrix);

            context.moveTo(firstPos.x, firstPos.y);

            for (var currentNdIndex in way.nds)
            {
                var currentNd = way.nds[currentNdIndex];
                var currentNode = this._nodes[currentNd];
                var currentPos = this.getXYFromLatLon(currentNode, latLonToXYMatrix);
                
                context.lineTo(currentPos.x, currentPos.y);
            }

        }

        context.closePath();
        context.stroke();

        this.endDrawing(context);
    };

    this.getXYFromLatLon = function(latLon, latLonToXYMatrix) {
        var latLonPoint = new Point(latLon.lon, this.latitudeToMercatorLatitude(latLon.lat));
	
        var result = latLonToXYMatrix.transformPoint(latLonPoint);

        return result;
    };

    this.getLatLonFromXY = function(xYPoint, xYToLatLonMatrix) {
        var latLonPoint = xYToLatLonMatrix.transformPoint(xYPoint);
	
        var result = {
			lat: this.mercatorLatitudeToLatitude(latLonPoint.y),
			lon: latLonPoint.x
        };
	
        return result;
    };
    
    this.setWayDefault = function(propertyName, propertyValue)
    {
        this._wayDefaults[propertyName] = propertyValue;
        this._dirty = true;
    };

    this.getWayProperty = function(propertyName, wayInfo)
    {
        if ((typeof wayInfo !== 'undefined') && (wayInfo.hasOwnProperty(propertyName)))
            return wayInfo[propertyName];
        else if (this._wayDefaults.hasOwnProperty(propertyName))
            return this._wayDefaults[propertyName];
        else
            return null;
    };

    this.doTagsMatch = function(tags, lineInfo)
    {
        var result = false;
        if (tags === null)
        {
            result = true;
        }
        else
        {
            if (lineInfo.hasOwnProperty('tags'))
            {
                var myTags = lineInfo.tags;
                
                for (var myTagIndex in myTags)
                {
                    var myTag = myTags[myTagIndex];
                    for (var tagIndex in tags)
                    {
                        var tag = tags[tagIndex];
                        if (myTag === tag)
                            result = true;
                    }
                }
                
            }
        }
            
        return result;
    };

    this.getTagsFromArgument = function(tagsArgument)
    {
        if (tagsArgument === null)
            return null;
		
        if (tagsArgument instanceof Array)
            return tagsArgument;
        else
            return [ tagsArgument ];
    };

    this.setEventHandler = function(eventName, functionName) {
        eventName = eventName.toLowerCase();
	
        if (eventName == 'click')
            this._onClickFunction = functionName;
        else if (eventName == 'doubleclick')
            this._onDoubleClickFunction = functionName;
        else if (eventName == 'mousedown')
            this._onMouseDownFunction = functionName;
        else if (eventName == 'mouseup')
            this._onMouseUpFunction = functionName;
        else if (eventName == 'mouseover')
            this._onMouseOverFunction = functionName;
        else if (eventName == 'mouseout')
            this._onMouseOutFunction = functionName;
        else if (eventName == 'mousemove')
            this._onMouseMoveFunction = functionName;
        else if (eventName == 'framerender')
            this._onFrameRenderFunction = functionName;
        else if (eventName == 'datachange')
            this._onDataChangeFunction = functionName;
        else if (eventName == 'waysload')
            this._onWaysLoadFunction = functionName;
        else if (eventName == 'valuesload')
            this._onValuesLoadFunction = functionName;
        else if (eventName == 'error')
            this._onErrorFunction = functionName;
        else if (eventName == 'viewchange')
            this._onViewChangeFunction = functionName;
        else
            this.logError( 'Unknown event name passed to MapRender::setEventHandler - "'+
                eventName+'" (expected click, doubleclick, mousedown, mouseup, mouseover, mouseout, framerender, datachange, waysload, valuesload, error or viewchange)');
    };

    this.setSize = function(width, height) {
        this.width = width;
        this.height = height;
        
        this._settings.width = width;
        this._settings.height = height;
        
    //	if (_timelineControls !== null)
    //		_timelineControls.setWidth(width);

        this._mainCanvas = this.createCanvas(width, height);

        this._informationLayerCanvas = this.createCanvas(width, height);
/*
        repositionMoveableElements();
*/        
        _dirty = true;	
    };
    
    this.setLatLonViewingArea = function(topLat, leftLon, bottomLat, rightLon) {
        topLat = this.latitudeToMercatorLatitude(topLat);
        bottomLat = this.latitudeToMercatorLatitude(bottomLat);
        
        var widthLon = (rightLon-leftLon);
        var heightLat = (bottomLat-topLat);
        
        var scaleX = (this._settings.width/widthLon);
        var scaleY = (this._settings.height/heightLat);

        var newMatrix = new Matrix();
        newMatrix.translate(-leftLon, -topLat);
        newMatrix.scale(scaleX, scaleY);

        this.setLatLonToXYMatrix(newMatrix);
    };

    this.setLatLonToXYMatrix = function (newMatrix)
    {
        this._latLonToXYMatrix = newMatrix;
        this._xYToLatLonMatrix = this._latLonToXYMatrix.clone();
        this._xYToLatLonMatrix.invert();
        
/*        updateZoomSliderDisplay(); */
    };
    

    this.makeEventArgument = function(event)
    {
        var currentPosition = this.getLocalPosition($(event.target), event.pageX, event.pageY);
        var mouseX = currentPosition.x;
        var mouseY = currentPosition.y;

        var mainLatLon = this.getLatLonFromXY(new Point(mouseX, mouseY), this._xYToLatLonMatrix);
        
        var mouseLatLon = null;
        for (var inlayIndex in this._inlays)
        {
            var inlay = this._inlays[inlayIndex];
            
            var screenTopLeft = this.getXYFromLatLon(inlay.worldTopLeftLatLon, this._latLonToXYMatrix);
            var screenBottomRight = this.getXYFromLatLon(inlay.worldBottomRightLatLon, this._latLonToXYMatrix);

            if ((mouseX>=screenTopLeft.x)&&
                (mouseX<screenBottomRight.x)&&
                (mouseY>=screenTopLeft.y)&&
                (mouseY<screenBottomRight.y))
            {
                var localX = (mouseX-screenTopLeft.x);
                var localY = (mouseY-screenTopLeft.y);
                mouseLatLon = this.getLatLonFromXY(new Point(localX, localY), inlay.xYToLatLonMatrix);
            }
        }
        
        if (mouseLatLon === null)
            mouseLatLon = mainLatLon;
        
        var mapPointData = {};
        mapPointData.lon = mouseLatLon.lon;
        mapPointData.lat = mouseLatLon.lat;
        mapPointData.x = mouseX;
        mapPointData.y = mouseY;

        return mapPointData;
    };
	
    this.mapMouseClickHandler = function(event)
    {
        var ohmThis = event.data;
    
        if (ohmThis.isEventInTopBar(event))
            return ohmThis.onTopBarClick(event);
        
        var continueHandling;
        if (ohmThis._onClickFunction !== null)
            continueHandling = ohmThis.externalInterfaceCall(ohmThis._onClickFunction, ohmThis.makeEventArgument(event));
        else
            continueHandling = true;
            
        return true;
    };

    this.mapMouseDoubleClickHandler = function(event)
    { 
        var ohmThis = event.data;
    
        if (ohmThis.isEventInTopBar(event))
            return ohmThis.onTopBarDoubleClick(event);

        var continueHandling;
        if (ohmThis._onDoubleClickFunction !== null)
            continueHandling = ohmThis.externalInterfaceCall(ohmThis._onDoubleClickFunction, ohmThis.makeEventArgument(event));
        else
            continueHandling = true;
            
        if (continueHandling)
        {
            var center = ohmThis.getLocalPosition($(event.target), event.pageX, event.pageY);
            var zoomFactor = 2.0;
            
            ohmThis.zoomMapByFactorAroundPoint(zoomFactor, center, false);
            
            ohmThis.onViewChange();	
        }
            
        return true;
    };

    this.mapMouseDownHandler = function(event) 
    { 
        var ohmThis = event.data;
    
        if (ohmThis.isEventInTopBar(event))
            return ohmThis.onTopBarMouseDown(event);

        var continueHandling;
        if (ohmThis._onMouseDownFunction !== null)
            continueHandling = ohmThis.externalInterfaceCall(ohmThis._onMouseDownFunction, ohmThis.makeEventArgument(event));
        else
            continueHandling = true;
        
        if (continueHandling)
        {
            var mousePosition = ohmThis.getLocalPosition($(event.target), event.pageX, event.pageY);

            ohmThis._isDragging = true;
            ohmThis._lastDragPosition = mousePosition; 
        }
        
        return true;
    };

    this.mapMouseUpHandler = function(event) 
    { 
        var ohmThis = event.data;
    
        if (ohmThis.isEventInTopBar(event))
            return ohmThis.onTopBarMouseUp(event);

        var continueHandling;
        if (ohmThis._onMouseUpFunction !== null)
            continueHandling = ohmThis.externalInterfaceCall(ohmThis._onMouseUpFunction, ohmThis.makeEventArgument(event));
        else
            continueHandling = true;
        
        if (continueHandling)
        {
            if (ohmThis._isDragging)
            {
                var mousePosition = ohmThis.getLocalPosition($(event.target), event.pageX, event.pageY);
        
                var positionChange = mousePosition.subtract(ohmThis._lastDragPosition);
        
                ohmThis.translateMapByScreenPixels(positionChange.x, positionChange.y, false);
        
                ohmThis._isDragging = false;
                
                ohmThis.onViewChange();
            }
        }
        
        return true;
    };

    this.mapMouseOverHandler = function(event)
    { 
        var ohmThis = event.data;
    
        if (ohmThis.isEventInTopBar(event))
            return ohmThis.onTopBarMouseOver(event);

        var continueHandling;
        if (ohmThis._onMouseOverFunction !== null)
            continueHandling = ohmThis.externalInterfaceCall(ohmThis._onMouseOverFunction, ohmThis.makeEventArgument(event));
        else
            continueHandling = true;
            
        return true;
    };

    this.mapMouseOutHandler = function(event)
    { 
        var ohmThis = event.data;
    
        if (ohmThis.isEventInTopBar(event))
            return ohmThis.onTopBarMouseOut(event);

        var continueHandling;
        if (ohmThis._onMouseOutFunction !== null)
            continueHandling = ohmThis.externalInterfaceCall(ohmThis._onMouseOutFunction, ohmThis.makeEventArgument(event));
        else
            continueHandling = true;
            
        return true;
    };

    this.mapMouseMoveHandler = function(event)
    { 
        var ohmThis = event.data;
    
        if (ohmThis.isEventInTopBar(event))
            return ohmThis.onTopBarMouseMove(event);

        var continueHandling;
        if (ohmThis._onMouseMoveFunction !== null)
            continueHandling = ohmThis.externalInterfaceCall(ohmThis._onMouseMoveFunction, ohmThis.makeEventArgument(event));
        else
            continueHandling = true;

        if (continueHandling)
        {
            if (ohmThis._isDragging)
            {
                var mousePosition = ohmThis.getLocalPosition($(event.target), event.pageX, event.pageY);
        
                var positionChange = mousePosition.subtract(ohmThis._lastDragPosition);
        
                ohmThis.translateMapByScreenPixels(positionChange.x, positionChange.y, true);
        
                ohmThis._lastDragPosition = mousePosition;
            }
        }
                
        return true;
    }

    this.doEveryFrame = function()
    {		
        if (this._redrawCountdown>0)
        {
            this._redrawCountdown -= 1;
            if (this._redrawCountdown===0)
                this._dirty = true;
        }
        
        if (this._valuesDirty&&(this._redrawCountdown===0))
        {
            if (!this._hasPointValues)
            {
                this.setWaysFromValues();
                this._dirty = true;
            }
            this._valuesDirty = false;		
        }
        
        if (this._dirty||this._pointBlobStillRendering||(this._mapTilesDirty&&(this._redrawCountdown===0)))
        {		
            this.drawMapIntoMainBitmap();

            this._dirty = false;
            this._redrawCountdown = 0;
        }
        
        this.drawMainBitmapIntoViewer();

        if (this._hasTabs)
        {
            /*this.drawTabsIntoViewer();*/
        }	
        
        if (this._hasTime)
        {
            if (this._timelineControls.isPlaying)
            {
                this._frameIndex += 1;
                if (this._frameIndex>=this._frameTimes.length)
                {
                    this._frameIndex = (this._frameTimes.length-1);
                    this._timelineControls.isPlaying = false;
                }
                
                /*this.updateTimelineDisplay();*/
                
                this._dirty = true;
                this._valuesDirty = true;
                this.onDataChange();
            }
        }

        if (this._onFrameRenderFunction !== null)
            this.externalInterfaceCall(this._onFrameRenderFunction, null);	
    };

    this.blankWay = function()
    {
        var result = {};
        
        result.boundingBox = new Rectangle();
        result.nds = [];
        result.tags = {};
        result.isClosed = false;
        
        for (var keyIndex in this._wayDefaults)
        {
            var key = this._wayDefaults[keyIndex];
            result.tags[key] = this._wayDefaults[key];
        }

        return result;	
    };

    this.onWaysLoad = function(data)
    { 	  		  	
        var waysData = $(data);
  	
        this._tagMap = {};

        var instance = this;

        waysData.find('node').each(function() {
            var newNode = {
                'lon': $(this).attr('lon'),
                'lat': $(this).attr('lat')
            };
            
            instance._nodes[$(this).attr('id')] = newNode;
        });

        waysData.find('way').each(function() {
            
            var wayId = $(this).attr('id');

            var newWay = instance.blankWay();
            newWay.id = wayId;

            var ndCount = 0;
            var firstNd = null;
            var lastNd = null;

            $(this).find('nd').each(function() {

                var ref = $(this).attr('ref');

                if (typeof instance._nodes[ref] === 'undefined')
                    return;

                ndCount += 1;
                newWay.nds.push(ref);
	  		
                if (firstNd===null)
                    firstNd = ref;
                lastNd = ref;
	  			  			
                var thisNode = instance._nodes[ref];
                var nodePos = new Point(thisNode.lon, thisNode.lat);
                newWay.boundingBox = instance.enlargeBoxToContain(newWay.boundingBox, nodePos);
            });
	  	
            newWay.isClosed = ((firstNd===lastNd)&&(!instance._settings.force_outlines));

            $(this).find('tag').each(function() {
                
                var key = $(this).attr('k');
                var value = $(this).attr('v');
	  		
                newWay.tags[key] = value;
	  		
                if (typeof instance._tagMap[key] === 'undefined')
                    instance._tagMap[key] = {};
	  			
                if (typeof instance._tagMap[key][value] === 'undefined')
                    instance._tagMap[key][value] = [];
	  			
                instance._tagMap[key][value].push(newWay.id);
            });
 		
            instance._ways[wayId] = newWay;
  		
            if (!newWay.boundingBox.isEmpty())
            {
                instance._worldBoundingBox = instance.enlargeBoxToContain(instance._worldBoundingBox, newWay.boundingBox.topLeft);
                instance._worldBoundingBox = instance.enlargeBoxToContain(instance._worldBoundingBox, newWay.boundingBox.bottomRight);
            }
        });

        this.buildWaysGrid();
        this._dirty = true;
        this._valuesDirty = true;
        if (this._onWaysLoadFunction!==null)
            this.externalInterfaceCall(this._onWaysLoadFunction, this._waysFileName);
    };
 	  
    this.loadWaysFromFile = function(waysFileName) 
    {
        var instance = this;
        this._waysFileName = waysFileName;
        $.get(waysFileName, function(data) {
            instance.onWaysLoad(data);
        });
    }

/*
private function decodeCSVRow(line: String, columnSeperator: String = ',') : Array
{
	var inQuotes: Boolean = false;
	var inEscape: Boolean = false;
	
	var result: Array = [];

	var currentValue: String = '';

	for( var i: int = 0; i < line.length; i+=1)
	{
		var currentChar: String = line.charAt(i);
	
		if (!inQuotes)
		{
			if (currentChar==='"')
			{
				inQuotes = true;
			}
			else if (currentChar===columnSeperator)
			{
				result.push(currentValue);
				currentValue = '';
			}
			else
			{
				currentValue += currentChar;
			}
		}
		else
		{
			if (!inEscape)
			{
				if (currentChar==='\\')
				{
					inEscape = true;
				}
				else if (currentChar==='"')
				{
					inQuotes = false;
				}
				else
				{
					currentValue += currentChar;
				}
				
			}
			else
			{
				currentValue += currentChar;
				inEscape = false;
			}
			
		}
		
	}
	
	result.push(currentValue);
	
	return result;
}

private function onValuesLoad(success:Boolean): void
{
	loadValuesFromCSVString(_valuesLoader.data.toString());

	if (_onValuesLoadFunction!==null)
		ExternalInterface.call(_onValuesLoadFunction, _valuesFileName);
}

private function loadValuesFromCSVString(valuesString: String): void
{
	var lineSeperator: String = '\n';
	var columnSeperator: String = ',';		  	

	var linesArray: Array = valuesString.split(lineSeperator);
	
	var headerLine: String = linesArray[0];

	_valueHeaders = decodeCSVRow(headerLine, columnSeperator);

	_timeColumnIndex = -1;
	_valueColumnIndex = -1;
	_latitudeColumnIndex = -1;
	_longitudeColumnIndex = -1;
	_tabColumnIndex = -1;
	for(var headerIndex:int = 0; headerIndex < _valueHeaders.length; headerIndex++ )
	{
		var header: String = _valueHeaders[headerIndex].toLowerCase();
		if (header==='time')
			_timeColumnIndex = headerIndex;	
		else if (header==='value')
			_valueColumnIndex = headerIndex;
		else if ((header==='latitude')||(header==='lat'))
			_latitudeColumnIndex = headerIndex;
		else if ((header==='longitude')||(header==='lon'))
			_longitudeColumnIndex = headerIndex;
		else if ((header==='tab')||(header==='category'))
			_tabColumnIndex = headerIndex;
	}
	
	var hasLatitude: Boolean = (_latitudeColumnIndex!==-1);
	var hasLongitude: Boolean = (_longitudeColumnIndex!==-1);
	
	if ((hasLatitude||hasLongitude)&&(hasLatitude!=hasLongitude))
	{
		logError( 'Error loading CSV file "'+_valuesFileName+'" - only found one of longitude or latitude in "'+headerLine+'"');
		return;		
	}
	
	_hasPointValues = hasLatitude;
	_hasTime = (_timeColumnIndex!==-1);
	_hasTabs = (_tabColumnIndex!==-1);
	
	_hasBitmapBackground = _hasPointValues;
	
	if (!_hasPointValues)
		loadAreaValues(linesArray, headerLine, columnSeperator);
	else
		loadPointValues(linesArray, headerLine, columnSeperator);
		
	if (_hasTime)
	{
		calculateFrameTimes();
		_frameIndex = 0;
		addTimelineControls();
	}
	
	_valuesDirty = true;
	_dirty = true;			
}

private function loadValuesFromFile(valuesFileName: String): void
{
	_valuesFileName = valuesFileName;
	_valuesLoader = new URLLoader(new URLRequest(valuesFileName));
	_valuesLoader.addEventListener("complete", onValuesLoad);
}*/

    this.drawInformationLayer = function(canvas, width, height, latLonToXYMatrix, xYToLatLonMatrix)
    {    
        var viewingArea = this.calculateViewingArea(width, height, xYToLatLonMatrix);

        var bitmapBackground = null;/*this.drawPointBlobBitmap(width, height, viewingArea, latLonToXYMatrix, xYToLatLonMatrix);*/
        
        this.drawWays(canvas, width, height, viewingArea, latLonToXYMatrix, bitmapBackground);
    };

    this.drawWays = function(canvas, width, height, viewingArea, latLonToXYMatrix, bitmapBackground)
    {
        var hasBitmap = (bitmapBackground!==null);
        var bitmapMatrix = new Matrix();
        bitmapMatrix.scale(this._settings.point_bitmap_scale, this._settings.point_bitmap_scale);
        
        var waysEmpty = true;
        for (var wayId in this._ways)
        {
            waysEmpty = false;
            break;
        }
        
        if (hasBitmap&&waysEmpty)
        {
            this.drawImage(canvas, bitmapBackground.get(0), 0, 0, (width*_settings.point_bitmap_scale), (height*_settings.point_bitmap_scale));
            return;
        }
        
        var context = this.beginDrawing(canvas);
        
        for (wayId in this._ways)
        {
            var way = this._ways[wayId];
            var wayColor;
            var wayAlpha;
            if (this.getWayProperty('highlighted', way)==true)
            {
                wayColor = Number(this.getWayProperty('highlightColor', way));
                wayAlpha = Number(this.getWayProperty('highlightAlpha', way));
            }
            else
            {
                wayColor = Number(this.getWayProperty('color', way.tags));
                wayAlpha = Number(this.getWayProperty('alpha', way.tags));
            }

            if (way.nds.length<1)
                continue;
            
            if (!viewingArea.intersects(way.boundingBox))
                continue;

            var isClosed = way.isClosed;

            context.beginPath();

            if (isClosed)
            {		
                var finalNd = way.nds[way.nds.length-1];
                var finalNode = this._nodes[finalNd];
                
                var finalPos = this.getXYFromLatLon(finalNode, latLonToXYMatrix);

                if (hasBitmap)
                    context.fillStyle = context.createPattern(bitmapBackground, 'no-repeat');
                else
                    context.fillStyle = this.colorStringFromNumber(wayColor, wayAlpha);
                
                context.moveTo(finalPos.x, finalPos.y);
            }
            else
            {
                var firstNd = way.nds[0];
                var firstNode = this._nodes[firstNd];
                
                var firstPos = this.getXYFromLatLon(firstNode, latLonToXYMatrix);

                context.lineStyle = this.colorStringFromNumber(wayColor,wayAlpha);

                context.moveTo(firstPos.x, firstPos.y);
            }

            for (var currentNdIndex in way.nds)
            {
                var currentNd = way.nds[currentNdIndex];
                var currentNode = this._nodes[currentNd];
                var currentPos = this.getXYFromLatLon(currentNode, latLonToXYMatrix);
                
                context.lineTo(currentPos.x, currentPos.y);
            }

            context.closePath();

            if (isClosed)
                context.fill();
            else
                context.stroke();
        }
        
        this.endDrawing(context);
    };

    this.setWaysFromValues = function()
    {	
        if (this._valueData === null)
            return;

        if (this._settings.is_gradient_value_range_set)
        {
            var minValue = this._settings.gradient_value_min;
            var maxValue = this._settings.gradient_value_max;	
        }
        else
        {
            minValue = this._smallestValue;
            maxValue = this._largestValue;
        }
        var valueScale = (1.0/(maxValue-minValue));

        var currentValues = this.getCurrentValues();
        
        var thisSetWayIds = {};
        
        if (this._hasTime)
            var currentTime = this._frameTimes[this._frameIndex];
        
        for (var valuesIndex in currentValues)
        {
            var values = currentValues[valuesIndex];
            if (this._hasTime)
            {
                var thisTime = values[this._timeColumnIndex];
                if (thisTime !== currentTime)
                    continue;
            }

            var matchKeys = {};
            var thisValue = 0;		
            for (var i = 0; i<values.length; i+=1)
            {
                if (i===this._valueColumnIndex)
                {
                    thisValue = values[i];
                }
                else if ((i!==this._timeColumnIndex)&&(i!==this._tabColumnIndex))
                {
                    var headerName = this._valueHeaders[i];
                    matchKeys[headerName] = values[i];	
                }
            }
            
            var setColor = this.getColorForValue(thisValue, minValue, maxValue, valueScale);
            
            this.setAttributeForMatchingWays(matchKeys, 'color', setColor, thisSetWayIds);
        }
        
        var defaultColor = this.getWayProperty('color');
        
        for (var lastWayId in this._lastSetWayIds)
        {
            if (thisSetWayIds.hasOwnProperty(lastWayId))
                continue;
                
            this._ways[lastWayId]['color'] = defaultColor;
        }
        
        this._lastSetWayIds = thisSetWayIds;
    };
/*
private function setColorGradient(colorList: Array) : void
{
	_colorGradient = [];
	
	for each (var colorString: String in colorList)
	{
		colorString = colorString.replace('#', '0x');
		
		var colorNumber: uint = (uint)(colorString);
		
		var alpha: uint;
		if (colorString.length>8)
			alpha = (colorNumber>>24)&0xff;
		else
			alpha = 0x7f;		
		
		var red: uint = (colorNumber>>16)&0xff;
		var green: uint = (colorNumber>>8)&0xff;
		var blue: uint = (colorNumber>>0)&0xff;
		
		var premultRed: uint = Math.floor((red*alpha)/255.0);
		var premultGreen: uint = Math.floor((green*alpha)/255.0);
		var premultBlue: uint = Math.floor((blue*alpha)/255.0);
		
		_colorGradient.push({
			alpha: alpha,
			red: premultRed,
			green: premultGreen,
			blue: premultBlue
		});
	}

	_valuesDirty = true;
	_redrawCountdown = 5;
}*/

    this.setAttributeForMatchingWays = function(matchKeys, attributeName, attributeValue, setWays)
    {
        var matchingWayIds = null;
        for (var key in matchKeys)
        {
            var value = matchKeys[key];
            
            var currentMatches;
            if (!this._tagMap.hasOwnProperty(key)||!this._tagMap[key].hasOwnProperty(value))
                currentMatches = [];
            else
                currentMatches = this._tagMap[key][value];
             
            if (matchingWayIds === null)
            {
                matchingWayIds = {};
                for (var wayIdIndex in currentMatches)
                {
                    var wayId = currentMatches[wayIdIndex];
                    matchingWayIds[wayId] = true;
                }
            }
            else
            {
                var previousMatchingWayIds = matchingWayIds;
                matchingWayIds = {};
                for (var wayIdIndex in currentMatches)
                {
                    var wayId = currentMatches[wayIdIndex];
                    if (typeof previousMatchingWayIds[wayId] !== 'undefined')
                        matchingWayIds[wayId] = true;
                }
            }
        }
            
        var foundCount = 0;
        for (wayIdIndex in matchingWayIds)
        {
            var wayId = matchingWayIds[wayIdIndex];
            this._ways[wayId]['tags'][attributeName] = attributeValue;
            foundCount += 1;
            setWays[wayId] = true;
        }

    //	if (foundCount===0)
    //	{
    //		trace('No match found for');
    //		for (key in matchKeys)
    //		{
    //			value = matchKeys[key];	
    //			trace(key+':'+value);
    //		}
    //	}

    };

    this.enlargeBoxToContain = function(box, pos)
    {
        if (box.containsPoint(pos))
            return box;
	
        if ((box.x==0)&&
            (box.y==0)&&
            (box.width==0)&&
            (box.height==0))
            return new Rectangle(pos.x, pos.y, 0, 0);
		
        if (box.left()>pos.x)
            box.left(pos.x);

        if (box.right()<pos.x)
            box.right(pos.x);

        if (box.top()>pos.y)
            box.top(pos.y);
            
        if (box.bottom()<pos.y)
            box.bottom(pos.y);
            
        return box;
    };

    this.buildWaysGrid = function()
    {
        this._waysGrid = new BucketGrid(this._worldBoundingBox, 16, 16);
        
        for (var wayId in this._ways)
        {
            var way = this._ways[wayId];

            var boundingBox = way.boundingBox;
            if (boundingBox.isEmpty())
                continue;
            
            this._waysGrid.insertObjectAt(boundingBox, wayId);
        }
    };
/*
private function getWaysContainingLatLon(lat: Number, lon: Number): Array
{
	var result: Array = new Array();

	var pos: Point = new Point(lon, lat);

	if (!_worldBoundingBox.containsPoint(pos))
		return result;
	
	if (_waysGrid===null)
		return result;
	
	var pixelsPerDegree: Number = getPixelsPerDegreeLatitude();
	var pixelsToDegreeScale: Number = (1.0/pixelsPerDegree);
	var ways: Array = _waysGrid.getContentsAtPoint(pos);
	
	for each (var wayId: String in ways)
	{
		var way: Object = _ways[wayId];
		var isInside: Boolean = false;
		if (way.isClosed)
		{
			if (way.boundingBox.containsPoint(pos))
			{
				isInside = isPointInsideClosedWay(pos, way);
			}
		}
		else
		{
			var lineThickness: Number = (Number)(getWayProperty('line_thickness', way));
			
			var thicknessInDegrees: Number = Math.abs((lineThickness+1)*pixelsToDegreeScale);
			
			var boundingBox: Rectangle = way.boundingBox.clone();
//			boundingBox.inflate(thicknessInDegrees/2, thicknessInDegrees/2);
			
			if (boundingBox.containsPoint(pos))
			{
				isInside = isPointOnWayLine(pos, way, thicknessInDegrees);	
			}			
		}
		
		if (isInside)
		{
			var wayResult: Object = {};
			wayResult.id = wayId;
			wayResult.tags = {};
			
			for (var key: String in way.tags)
			{
				// Pete - Safari really doesn't like colons in member names! 
				key = key.replace(':', '_colon_');
				var value: String = way.tags[key];
				wayResult.tags[key] = value;
			}
			
			result.push(wayResult);
		}
	}
	
	return result;
}

private function addTimelineControls(): void
{
	if (_timelineControls === null)
	{
		_timelineControls = new TimelineControls();
		_timelineControls.percentWidth = 100;
		_timelineControls.setWidth(_settings.width-250);
		
		var verticalCenter: Number = ((_settings.height/2)-40);
		_timelineControls.y = (_settings.height-50);
	
		_timelineControls.setTimeTextStyle(12, 0x000000);
		
		_timelineControls.setOnUserInputCallback(onTimelineUserInput);
	
		addChild(this._timelineControls);
	}
	
	updateTimelineDisplay();
}

private function onTimelineUserInput(dragging: Boolean): void
{
	var sliderValue: Number = _timelineControls.sliderValue;

	var totalFrames: int = _frameTimes.length;

	_frameIndex = Math.round(sliderValue*totalFrames);
	_frameIndex = Math.min(_frameIndex, (totalFrames-1));
	_frameIndex = Math.max(_frameIndex, 0);
	
	updateTimelineDisplay();
	
	if (dragging)
		_redrawCountdown = 5;
	else
		_dirty = true;
		
	_valuesDirty = true;
	onDataChange();
}

private function updateTimelineDisplay(): void
{
	if (_frameTimes.length>0)
	{
		var currentTime: String = _frameTimes[_frameIndex];
		_timelineControls.timeText = currentTime;
		
		var totalFrames: int = _frameTimes.length;
		_timelineControls.sliderValue = (_frameIndex/totalFrames);
	}
}

private function getValueForWayId(wayId: String): String
{
	if (typeof _ways[wayId] === 'undefined')
		return null;
		
	var way: Object = _ways[wayId];

	if (_valueData === null)
		return null;

	var currentValues: Array = getCurrentValues();
	
	var resultFound: Boolean = false;
	var result: String;
	for each (var values: Array in currentValues)
	{
		var matchKeys: Object = {};
		var thisValue: String = null;		
		for (var i:int = 0; i<values.length; i+=1)
		{
			if (i===_valueColumnIndex)
			{
				thisValue = values[i];
			}
			else if ((i!==_timeColumnIndex)&&(i!==_tabColumnIndex))
			{
				var headerName: String = _valueHeaders[i];
				matchKeys[headerName] = values[i];	
			}
		}
		
		var allMatch: Boolean = true;
		for (var key: String in matchKeys)
		{
			var value:String = matchKeys[key];
			
			if (way.tags[key]!==value)
				allMatch = false;	
		}
		
		if (allMatch)
		{
			resultFound = true;
			result = thisValue;
		}
	}

	if (resultFound)
		return result;
	else
		return null;
}

private function addInlay(leftX: Number, topY: Number, rightX: Number, bottomY: Number, topLat: Number, leftLon: Number, bottomLat: Number, rightLon: Number): void
{
	var mercatorTopLat: Number = latitudeToMercatorLatitude(topLat);
	var mercatorBottomLat: Number = latitudeToMercatorLatitude(bottomLat);
	
	var width: Number = (rightX-leftX);
	var height: Number = (bottomY-topY);
	
	var widthLon: Number = (rightLon-leftLon);
	var heightLat: Number = (mercatorBottomLat-mercatorTopLat);
	
	var scaleX: Number = (width/widthLon);
	var scaleY: Number = (height/heightLat);

	var latLonToXYMatrix: Matrix = new Matrix();
	latLonToXYMatrix.translate(-leftLon, -mercatorTopLat);
	latLonToXYMatrix.scale(scaleX, scaleY);	

	var xYToLatLonMatrix: Matrix = latLonToXYMatrix.clone();
	xYToLatLonMatrix.invert();
	
	var worldTopLeftLatLon: Object = getLatLonFromXY(new Point(leftX, topY), _xYToLatLonMatrix);
	var worldBottomRightLatLon: Object = getLatLonFromXY(new Point(rightX, bottomY), _xYToLatLonMatrix);
	
	_inlays.push({
		latLonToXYMatrix: latLonToXYMatrix,
		xYToLatLonMatrix: xYToLatLonMatrix,
		worldTopLeftLatLon: worldTopLeftLatLon,
		worldBottomRightLatLon: worldBottomRightLatLon,
		topLat: topLat,
		leftLon: leftLon,
		bottomLat: bottomLat,
		rightLon: rightLon
	});
}*/

    this.cropPoint = function(input, area)
    {
        var result = input.clone();
        
        if (result.x<area.left)
            result.x = area.left;
        
        if (result.x>area.right)
            result.x = area.right;	
        
        if (result.y<area.top)
            result.y = area.top;
        
        if (result.y>area.bottom)
            result.y = area.bottom;	

        return result;	
    };

    this.drawMapIntoMainBitmap = function()
    {
        this.clearCanvas(this._mainCanvas);
        this.fillRect(this._mainCanvas, 0, 0, this._settings.width, this._settings.height, this._settings.ocean_color);

        if (this._settings.show_map_tiles)
        {
    		this.trackMapTilesUsage();
            this.drawMapTiles(this._mainCanvas, this._settings.width, this._settings.height, this._latLonToXYMatrix, this._xYToLatLonMatrix);
        }

        if (this._dirty||this._pointBlobStillRendering)
        {			
            this.clearCanvas(this._informationLayerCanvas);
            this.drawInformationLayer(this._informationLayerCanvas, this._settings.width, this._settings.height, this._latLonToXYMatrix, this._xYToLatLonMatrix);
        }

        this.drawImage(this._mainCanvas, this._informationLayerCanvas.get(0), 0, 0, this._settings.width, this._settings.height);
                
        for (var inlayIndex in this._inlays)
        {
            var inlay = this._inlays[inlayIndex];
            
            var screenTopLeft = this.getXYFromLatLon(inlay.worldTopLeftLatLon, this._latLonToXYMatrix);
            var screenBottomRight = this.getXYFromLatLon(inlay.worldBottomRightLatLon, this._latLonToXYMatrix);
            
            var screenArea = new Rectangle(0, 0, this._settings.width, this._settings.height);
            
            var croppedScreenTopLeft = this.cropPoint(screenTopLeft, screenArea);
            var croppedScreenBottomRight = this.cropPoint(screenBottomRight, screenArea);
            
            var inlayWidth = (croppedScreenBottomRight.x-croppedScreenTopLeft.x);
            var inlayHeight = (croppedScreenBottomRight.y-croppedScreenTopLeft.y);
            
            if ((inlayWidth<1)||(inlayHeight<1))
                continue;
            
            var inlayScreenLeftX = croppedScreenTopLeft.x;
            var inlayScreenTopY = croppedScreenTopLeft.y;
            
            var localTopLeft = croppedScreenTopLeft.subtract(screenTopLeft);

            var croppedLatLonToXYMatrix = inlay.latLonToXYMatrix.clone();
            croppedLatLonToXYMatrix.translate(-localTopLeft.x, -localTopLeft.y);
            
            var croppedXYToLatLonMatrix = croppedLatLonToXYMatrix.clone();
            croppedXYToLatLonMatrix.invert();
            
            drawingSurface = this.createCanvas(inlayWidth, inlayHeight);
            
            if (this._settings.show_map_tiles)	
                this.drawMapTiles(drawingSurface, inlayWidth, inlayHeight, croppedLatLonToXYMatrix, croppedXYToLatLonMatrix);

            this.drawInformationLayer(drawingSurface, inlayWidth, inlayHeight, croppedLatLonToXYMatrix, croppedXYToLatLonMatrix);
            
            var borderTopLeft = screenTopLeft.subtract(croppedScreenTopLeft);
            var borderBottomRight = screenBottomRight.subtract(croppedScreenTopLeft).subtract(new Point(1, 1));
            
            borderTopLeft.x = Math.floor(borderTopLeft.x);
            borderTopLeft.y = Math.floor(borderTopLeft.y);
            
            borderBottomRight.x = Math.floor(borderBottomRight.x);
            borderBottomRight.y = Math.floor(borderBottomRight.y);
            
            if (this._settings.show_map_tiles)
            {
                var context = this.beginDrawing(drawingSurface);
                context.lineWidth = 1.0;
                context.strokeStyle = this.colorStringFromNumber(this._settings.inlay_border_color, 1.0);

                context.beginPath();
                context.moveTo(borderTopLeft.x, borderTopLeft.y);
                context.lineTo(borderBottomRight.x, borderTopLeft.y);
                context.lineTo(borderBottomRight.x, borderBottomRight.y);
                context.lineTo(borderTopLeft.x, borderBottomRight.y);
                context.lineTo(borderTopLeft.x, borderTopLeft.y);
                context.closePath();
                context.stroke();
                
                this.endDrawing(context);
            }
        
            this.drawImage(this._mainCanvas, drawingSurface.get(0), inlayScreenLeftX, inlayScreenTopY);
        }

        this._mainBitmapTopLeftLatLon = this.getLatLonFromXY(new Point(0, 0), this._xYToLatLonMatrix);
        this._mainBitmapBottomRightLatLon = this.getLatLonFromXY(new Point(this._settings.width, this._settings.height), this._xYToLatLonMatrix);

        if (this._settings.show_map_tiles)
        {
            this.deleteUnusedMapTiles();
        }
    };

    this.drawMainBitmapIntoViewer = function()
    {
        this.clearCanvas(this._canvas);
        
        if ((this._mainBitmapTopLeftLatLon===null)||
            (this._mainBitmapBottomRightLatLon===null))
            return;
            
        var screenBitmapTopLeft = this.getXYFromLatLon(this._mainBitmapTopLeftLatLon, this._latLonToXYMatrix);
        var screenBitmapBottomRight = this.getXYFromLatLon(this._mainBitmapBottomRightLatLon, this._latLonToXYMatrix);	

        var screenBitmapLeft = screenBitmapTopLeft.x;
        var screenBitmapTop = screenBitmapTopLeft.y;
        
        var screenBitmapWidth = (screenBitmapBottomRight.x-screenBitmapTopLeft.x);
        var screenBitmapHeight = (screenBitmapBottomRight.y-screenBitmapTopLeft.y);
        
        this.drawImage(this._canvas, this._mainCanvas.get(0), screenBitmapLeft, screenBitmapTop, screenBitmapWidth, screenBitmapHeight);
    };

    this.translateMapByScreenPixels = function(x, y, dragging)
    {
        this._latLonToXYMatrix.translate(x, y);
        this._xYToLatLonMatrix = this._latLonToXYMatrix.clone();
        this._xYToLatLonMatrix.invert();
        
        if (dragging)
            this._redrawCountdown = 5;
        else
            this._dirty = true;
    };

    this.zoomMapByFactorAroundPoint = function(zoomFactor, center, dragging)
    {
        var translateToOrigin = new Matrix();
        translateToOrigin.translate(-center.x, -center.y);
        
        var scale = new Matrix();
        scale.scale(zoomFactor, zoomFactor);
        
        var translateFromOrigin = new Matrix();
        translateFromOrigin.translate(center.x, center.y);

        var zoom = new Matrix();
        zoom.concat(translateToOrigin);
        zoom.concat(scale);
        zoom.concat(translateFromOrigin);
        
        this._latLonToXYMatrix.concat(zoom);
        this._xYToLatLonMatrix = this._latLonToXYMatrix.clone();
        this._xYToLatLonMatrix.invert();

        for (var inlayIndex in this._inlays)
        {
            var inlay = this._inlays[inlayIndex];
            var newLatLonToXYMatrix = inlay.latLonToXYMatrix.clone();
            newLatLonToXYMatrix.concat(scale);
            
            var newXYToLatLonMatrix = newLatLonToXYMatrix.clone();
            newXYToLatLonMatrix.invert();
            
            inlay.latLonToXYMatrix = newLatLonToXYMatrix;
            inlay.xYToLatLonMatrix = newXYToLatLonMatrix;
        }
        
        if (dragging)
            this._redrawCountdown = 5;
        else
            this._dirty = true;
            
/*        this.updateZoomSliderDisplay();*/
    };

    this.createViewerElements = function()
    {
        this._mainCanvas = this.createCanvas(this._settings.width, this._settings.height);

        this._informationLayerCanvas = this.createCanvas(this._settings.width, this._settings.height);

        /*
        _zoomSlider = new VSlider();
        _zoomSlider.x = 4;
        _zoomSlider.y = 50;
        _zoomSlider.height = 150;
        _zoomSlider.showDataTip = false;
        _zoomSlider.minimum = 0;
        _zoomSlider.maximum = 1;
        _zoomSlider.liveDragging = true;

        _zoomSlider.addEventListener( SliderEvent.CHANGE, onZoomThumbDrag );
        _zoomSlider.addEventListener( SliderEvent.THUMB_DRAG, onZoomThumbDrag );
        _zoomSlider.addEventListener( SliderEvent.THUMB_RELEASE, onZoomThumbRelease );
        _zoomSlider.addEventListener( SliderEvent.THUMB_PRESS, onZoomThumbRelease );
        
        addChild(_zoomSlider);

        var plusImage: BitmapAsset = BitmapAsset( new PlusImage() );
        var minusImage: BitmapAsset = BitmapAsset( new MinusImage() );

        var blackTint:ColorTransform = new ColorTransform();
        blackTint.color = 0x000000;
        
        plusImage.x = 6;
        plusImage.y = 40;
        plusImage.transform.colorTransform = blackTint;
        viewer.addChild(plusImage);
        
        minusImage.x = 6;
        minusImage.y = 195;
        minusImage.transform.colorTransform = blackTint;
        viewer.addChild(minusImage);
        
        _credit = new Label();
        _credit.htmlText = _settings.credit_text;
        _credit.width = 150;
        _credit.height = 20;
        _credit.setStyle('text-align', 'right');
        _credit.setStyle('color', _settings.credit_color);
        
        _credit.addEventListener( MouseEvent.CLICK, function(): void {
            var url:String = "http://"+_credit.text;
            var request:URLRequest = new URLRequest(url);
            navigateToURL(request); 	  	
        });
        
        viewer.addChild(_credit);

        _title = new TextField();
        _title.htmlText = '<p align="center"><u>'+_settings.title_text+'</u></p>';
        _title.width = _settings.width;
        _title.height = (_settings.title_size*1.5);
        _title.textColor = _settings.title_color;
        _title.background = true;
        _title.backgroundColor = _settings.title_background_color;
    //	_title.fontSize = _settings.title_size;
        _title.y = -1000;

        var titleFormat: TextFormat = _title.defaultTextFormat;
        titleFormat.size = _settings.title_size;
        titleFormat.font = 'Verdana';
        _title.defaultTextFormat = titleFormat;
        
        viewer.addChild(_title);

        repositionMoveableElements();
        */
    };
/*
private function onZoomThumbDrag( event: SliderEvent ): void
{
	var pixelsPerDegreeLatitude: Number = calculatePixelsPerDegreeLatitudeFromZoomSlider();
	
	setPixelsPerDegreeLatitude(pixelsPerDegreeLatitude, true);

	onViewChange();
}

private function onZoomThumbRelease( event: SliderEvent ): void
{
	var pixelsPerDegreeLatitude: Number = calculatePixelsPerDegreeLatitudeFromZoomSlider();
	
	setPixelsPerDegreeLatitude(pixelsPerDegreeLatitude, false);	

	onViewChange();
}

private function getPixelsPerDegreeLatitude(): Number
{
	var pixelsPerDegreeLatitude: Number = _latLonToXYMatrix.d;
	
	return pixelsPerDegreeLatitude;
}

private function setPixelsPerDegreeLatitude(newPixelsPerDegreeLatitude: Number, dragging: Boolean = false): void
{
	var oldPixelsPerDegreeLatitude: Number = getPixelsPerDegreeLatitude();
	
	var zoomFactor: Number = (newPixelsPerDegreeLatitude/oldPixelsPerDegreeLatitude);
	
	var center: Point = new Point((_settings.width/2), (_settings.height/2));
	
	zoomMapByFactorAroundPoint(zoomFactor, center, dragging);
}

private function calculatePixelsPerDegreeLatitudeFromZoomSlider(): Number
{
	var sliderValue: Number = _zoomSlider.value;
	
	var lerpValue: Number = Math.pow(sliderValue, _settings.zoom_slider_power);

	var minPixelsPerDegreeLatitude: Number = (_settings.height/_settings.zoomed_out_degrees_per_pixel);
	var maxPixelsPerDegreeLatitude: Number = (_settings.height/_settings.zoomed_in_degrees_per_pixel);

	var oneMinusLerp: Number = (1-lerpValue);
	
	var result: Number = (minPixelsPerDegreeLatitude*oneMinusLerp)+
		(maxPixelsPerDegreeLatitude*lerpValue);
	
	return result;
}

private function updateZoomSliderDisplay(): void
{
	var pixelsPerDegreeLatitude: Number = getPixelsPerDegreeLatitude();

	var minPixelsPerDegreeLatitude: Number = (_settings.height/_settings.zoomed_out_degrees_per_pixel);
	var maxPixelsPerDegreeLatitude: Number = (_settings.height/_settings.zoomed_in_degrees_per_pixel);

	var lerpValue: Number = ((pixelsPerDegreeLatitude-minPixelsPerDegreeLatitude)/
		(maxPixelsPerDegreeLatitude-minPixelsPerDegreeLatitude));
	
	var sliderValue: Number = Math.pow(lerpValue, (1/_settings.zoom_slider_power));

	_zoomSlider.value = sliderValue;
}

private function setGradientValueRange(min: Number, max: Number): void
{
	_settings.is_gradient_value_range_set = true;
	_settings.gradient_value_min = min;
	_settings.gradient_value_max = max;
}

private function calculateFrameTimes(): void
{
	_frameTimes = [];
	
	for (var thisTime: String in _foundTimes)
	{
		if ((_settings.time_range_start!==null)&&(thisTime<_settings.time_range_start))
			continue;

		if ((_settings.time_range_end!==null)&&(thisTime>_settings.time_range_end))
			continue;
		
		_frameTimes.push(thisTime);
	}
	_frameTimes.sort();
	
	if (_frameIndex>(_frameTimes.length-1))
		_frameIndex = (_frameTimes.length-1);
}
*/
    this.onDataChange = function()
    {
        if (this._onDataChangeFunction!==null)
            this.externalInterfaceCall(this._onDataChangeFunction, null);	
    };

    this.logError = function(message) {
        alert('Error: '+message);
        if (_onErrorFunction!==null)
            this.externalInterfaceCall(_onErrorFunction, message);	
    };

    this.onViewChange = function()
    {
        if (this._onViewChangeFunction!==null)
            this.externalInterfaceCall(this._onViewChangeFunction, null);	
    };
/*
private function getWayForWayId(wayId: String): Object
{
	var result: Object = _ways[wayId];
	
	return result;	
}

private function isPointInsideClosedWay(pos: Point, way: Object): Boolean
{
	var xIntersections: Array = [];

	var lineStart: Point = null;
	var isFirst: Boolean = true;
	
	for each (var currentNd: String in way.nds)
	{
		var currentNode: Object = _nodes[currentNd];
		var lineEnd: Point = new Point(currentNode.lon, currentNode.lat);
		
		if (isFirst)
		{
			isFirst = false;
		}
		else
		{
			if (((lineStart.y>pos.y)&&(lineEnd.y<pos.y))||
				((lineStart.y<pos.y)&&(lineEnd.y>pos.y)))
			{
				var lineDirection: Point = new Point(lineEnd.x-lineStart.x, lineEnd.y-lineStart.y);
				var yDelta: Number = (pos.y-lineStart.y);
				var yProportion: Number = (yDelta/lineDirection.y);
				
				var xIntersect: Number = (lineStart.x+(lineDirection.x*yProportion));
				xIntersections.push(xIntersect);
			}
			
		}
		
		lineStart = lineEnd;
	}
	
	xIntersections.sort(function(a:Number, b:Number): int {
		if (a<b) return -1;
		else if (a>b) return 1;
		else return 0; 
	});
	
	var isInside: Boolean = false;
	for (var index: int = 0; index<(xIntersections.length-1); index += 2)
	{
		var leftX: Number = xIntersections[index];
		var rightX: Number = xIntersections[(index+1)];

		if ((leftX<=pos.x)&&(rightX>pos.x))
			isInside = true;
		
	}
				
	return isInside;
}

private function isPointOnWayLine(pos: Point, way: Object, thickness: Number): Boolean
{
	var lineStart: Point = null;
	var isFirst: Boolean = true;
	
	var thicknessSquared: Number = (thickness*thickness);
	
	var isInside: Boolean = false;
	for each (var currentNd: String in way.nds)
	{
		var currentNode: Object = _nodes[currentNd];
		var lineEnd: Point = new Point(currentNode.lon, currentNode.lat);
		
		if (isFirst)
		{
			isFirst = false;
		}
		else
		{
			var lineDirection: Point = new Point(lineEnd.x-lineStart.x, lineEnd.y-lineStart.y);
			
			var lineDirectionSquared: Number = ((lineDirection.x*lineDirection.x)+(lineDirection.y*lineDirection.y));
			
			var s: Number = ((pos.x-lineStart.x)*lineDirection.x)+((pos.y-lineStart.y)*lineDirection.y);
			s /= lineDirectionSquared;
			
			s = Math.max(s, 0);
			s = Math.min(s, 1);
			
			var closestPoint: Point = new Point((lineStart.x+s*lineDirection.x), (lineStart.y+s*lineDirection.y));
			
			var delta: Point = pos.subtract(closestPoint);
			
			var distanceSquared: Number = ((delta.x*delta.x)+(delta.y*delta.y));
			
			if (distanceSquared<thicknessSquared)
			{
				isInside = true;
				break;
			}
		}
		
		lineStart = lineEnd;
	}
	
				
	return isInside;
}

private function drawPointBlobBitmap(width: Number, height: Number, viewingArea: Rectangle, latLonToXYMatrix: Matrix, xYToLatLonMatrix: Matrix): BitmapData
{
	if (!_hasPointValues)
		return null;
	
	if (_dirty)
	{
		createPointsGrid(viewingArea, latLonToXYMatrix);
	
		_pointBlobBitmapWidth = (width/_settings.point_bitmap_scale);
		_pointBlobBitmapHeight = (height/_settings.point_bitmap_scale);
	
		_pointBlobBitmap = new BitmapData(_pointBlobBitmapWidth, _pointBlobBitmapHeight, true, 0x000000);
		
		_pointBlobTileX = 0;
		_pointBlobTileY = 0;
		
		_pointBlobStillRendering = true;
	}

	var tileSize: int = 128;	
	
	while (_pointBlobTileY<_pointBlobBitmapHeight)
	{
		var distanceFromBottom: int = (_pointBlobBitmapHeight-_pointBlobTileY);
		var tileHeight: int = Math.min(tileSize, distanceFromBottom);
		
		while (_pointBlobTileX<_pointBlobBitmapWidth)
		{	
			var distanceFromRight: int = (_pointBlobBitmapWidth-_pointBlobTileX);
			var tileWidth: int = Math.min(tileSize, distanceFromRight);
			
			drawPointBlobTile(width, height, viewingArea, latLonToXYMatrix, xYToLatLonMatrix, _pointBlobTileX, _pointBlobTileY, tileWidth, tileHeight);
			
			_pointBlobTileX+=tileSize;

			return _pointBlobBitmap;
		}
		
		_pointBlobTileX = 0;
		_pointBlobTileY+=tileSize
	}
	
	_pointBlobStillRendering = false;
	
	return _pointBlobBitmap;
}

private function loadAreaValues(linesArray: Array, headerLine: String, columnSeperator: String): void
{
	if (_valueColumnIndex===-1)
	{
		logError( 'Error loading CSV file "'+_valuesFileName+'" - missing value column from header "'+headerLine+'"');
		return;
	}
	
	_foundTimes = {};
	_tabNames = [];
	_tabInfo = {};
	
	_valueData = [];
	
	for(var i : int = 1; i < linesArray.length; i++ )
	{
		var lineString: String = linesArray[i];
		var lineValues: Array = decodeCSVRow(lineString, columnSeperator);
		
		var thisValue: Number = (Number)(lineValues[_valueColumnIndex]);
		
		if ((i===1)||(thisValue<_smallestValue))
			_smallestValue = thisValue;
			
		if ((i===1)||(thisValue>_largestValue))
			_largestValue = thisValue;
		
		var dataDestination: Array = _valueData;

		if (_hasTabs)
		{
			var thisTab: String = lineValues[_tabColumnIndex];
			if (thisTab !== null)
			{
				if (typeof _tabInfo[thisTab] === 'undefined')
				{
					_tabInfo[thisTab] = {};
					_tabNames.push(thisTab);
				}
				
				if (typeof dataDestination[thisTab]==='undefined')
				{
					dataDestination[thisTab] = [];
				}
				
				dataDestination = dataDestination[thisTab];
			}			
		}		
		
		if (_hasTime)
		{
			var thisTime: String = lineValues[_timeColumnIndex];
			if ((thisTime !== null)&&(thisTime!=''))
			{
				if (typeof _foundTimes[thisTime] === 'undefined')
				{
					_foundTimes[thisTime] = true;
				}
				
				if (typeof dataDestination[thisTime] === 'undefined')
				{				
					dataDestination[thisTime] = [];
				}

				dataDestination = dataDestination[thisTime];
			}
		}

		dataDestination.push(lineValues);	
	}
	
}

private function loadPointValues(linesArray: Array, headerLine: String, columnSeperator: String): void
{	
	_foundTimes = {};
	_tabInfo = {};
	_tabNames = [];
		
	_valueData = [];
	
	for(var i : int = 1; i < linesArray.length; i++ )
	{
		var lineString: String = linesArray[i];
		var lineValues: Array = decodeCSVRow(lineString, columnSeperator);
		
		var thisLatitude: Number = (Number)(lineValues[_latitudeColumnIndex]);
		var thisLongitude: Number = (Number)(lineValues[_longitudeColumnIndex]);

		lineValues[_latitudeColumnIndex] = thisLatitude;
		lineValues[_longitudeColumnIndex] = thisLongitude;

		if (_valueColumnIndex!==-1)
		{
			var thisValue: Number = (Number)(lineValues[_valueColumnIndex]);
			lineValues[_valueColumnIndex] = thisValue;
			
			if ((i===1)||(thisValue<_smallestValue))
				_smallestValue = thisValue;
			
			if ((i===1)||(thisValue>_largestValue))
				_largestValue = thisValue;
		}
		
		var dataDestination: Array = _valueData;
		
		if (_hasTabs)
		{
			var thisTab: String = lineValues[_tabColumnIndex];
			if (thisTab !== null)
			{
				if (typeof _tabInfo[thisTab] === 'undefined')
				{
					_tabInfo[thisTab] = {};
					_tabNames.push(thisTab);					
					dataDestination[thisTab] = [];
				}
				
				dataDestination = dataDestination[thisTab];
			}			
		}		
		
		if (_hasTime)
		{
			var thisTime: String = lineValues[_timeColumnIndex];
			if ((thisTime !== null)&&(thisTime!=''))
			{
				if (typeof _foundTimes[thisTime] === 'undefined')
				{
					_foundTimes[thisTime] = true;
					dataDestination[thisTime] = [];
				}
				
				dataDestination = dataDestination[thisTime];
			}
		}
		
		dataDestination.push(lineValues);	
	}		
}*/

    this.getColorForValue = function(thisValue, minValue, maxValue, valueScale)
    {	
        var normalizedValue = ((thisValue-minValue)*valueScale); 
        normalizedValue = Math.min(normalizedValue, 1.0);
        normalizedValue = Math.max(normalizedValue, 0.0);
        
        var fractionalIndex = (normalizedValue*(this._colorGradient.length-1));
        
        var lowerIndex = Math.floor(fractionalIndex);
        var higherIndex = Math.ceil(fractionalIndex);
        var lerpValue = (fractionalIndex-lowerIndex);
        var oneMinusLerp = (1.0-lerpValue);
        
        var lowerValue = this._colorGradient[lowerIndex];
        var higherValue = this._colorGradient[higherIndex];
        
        var alpha = ((lowerValue.alpha*oneMinusLerp)+(higherValue.alpha*lerpValue));
        var red = ((lowerValue.red*oneMinusLerp)+(higherValue.red*lerpValue));
        var green = ((lowerValue.green*oneMinusLerp)+(higherValue.green*lerpValue));
        var blue = ((lowerValue.blue*oneMinusLerp)+(higherValue.blue*lerpValue));
        
        var setColor = ((alpha<<24)|(red<<16)|(green<<8)|(blue<<0));
        
        return setColor;
    };
/*
private function getValuePointsNearLatLon(lat: Number, lon: Number, radius: Number = 0): Object
{
	if (radius===0)
		radius = _settings.point_blob_radius;
	
	var radiusSquared: Number = (radius*radius);

	var currentValues: Array = getCurrentValues();
		
	var result: Array = [];
	for each (var values: Array in currentValues)
	{
		var valueLat: Number = values[_latitudeColumnIndex];
		var valueLon: Number = values[_longitudeColumnIndex];
		
		var deltaLat: Number = (valueLat-lat);
		var deltaLon: Number = (valueLon-lon);
		
		var distanceSquared: Number = ((deltaLat*deltaLat)+(deltaLon*deltaLon));
		
		if (distanceSquared<radiusSquared)
		{
			var output: Object = {};
			for(var headerIndex:int = 0; headerIndex < _valueHeaders.length; headerIndex++ )
			{
				var header: String = '"'+_valueHeaders[headerIndex].toLowerCase()+'"';

				output[header] = values[headerIndex];
			}
			
			result.push(output);
		}
	
	}
	
	return result;
}*/

    this.setSetting = function(key, value)
    {
        if (!this._settings.hasOwnProperty(key))
        {
            this.logError('Unknown key in setSetting('+key+')');
            return;
        }

        if (typeof this._settings[key] === "boolean")
        {	
            if (typeof value === 'string')
            {
                value = (value==='true');
            }
                
            this._settings[key] = (Boolean)(value);
        }
        else
        {
            this._settings[key] = value;
        }
            
        var changeHandlers =
        {
            'title_text': function(instance) {
                instance._title.htmlText = '<p align="center"><u>'+instance._settings.title_text+'</u></p>';
                if (instance._settings.title_text!=='')
                    instance._title.y = 0;
                else
                    instance._title.y = -1000;
            },
            'time_range_start': function(instance) {
                instance.calculateFrameTimes();
                instance.updateTimelineDisplay();
            },
            'time_range_end': function(instance) {
                instance.calculateFrameTimes();
                instance.updateTimelineDisplay();
            },
            'point_blob_radius': function(instance) {
                instance._valuesDirty = true;
                instance._dirty = true;
            },
            'point_blob_value': function(instance) {
                instance._valuesDirty = true;
                instance._dirty = true;
            },
            'gradient_value_min': function(instance) {
                instance._settings.is_gradient_value_range_set =
                    ((instance._settings.gradient_value_min!=0)||
                    (instance._settings.gradient_value_max!=0));
                instance._valuesDirty = true;
                instance._dirty = true;
            },
            'gradient_value_max': function(instance) {
                instance._settings.is_gradient_value_range_set =
                    ((instance._settings.gradient_value_min!=0)||
                    (instance._settings.gradient_value_max!=0));
                instance._valuesDirty = true;
                instance._dirty = true;
            },
            'ocean_color': function(instance) {
                if (typeof instance._settings.ocean_color === 'string')
                {
                    instance._settings.ocean_color = instance._settings.ocean_color.replace('#', '0x');
                    instance._settings.ocean_color = (Number)(instance._settings.ocean_color);
                }
            },
            'title_background_color': function(instance) {
                if (typeof instance._settings.title_background_color === 'string')
                {
                    instance._settings.title_background_color = instance._settings.title_background_color.replace('#', '0x');
                    instance._settings.title_background_color = (Number)(instance._settings.title_background_color);
                }
                instance._title.backgroundColor = instance._settings.title_background_color;
            },
            'show_map_tiles': function(instance) {
                if (typeof instance._settings.show_map_tiles==='string')
                    instance._settings.show_map_tiles = (Boolean)(instance._settings.show_map_tiles);
                instance._mapTilesDirty = true;
            },
            'information_alpha': function(instance) {
                instance.setWayDefault('alpha', instance._settings.information_alpha);
            }
        }
        
        if (changeHandlers.hasOwnProperty(key))
            changeHandlers[key](this);
    };
/*
private function repositionMoveableElements(): void
{
	if (_credit !== null)
	{
		_credit.x = (_settings.width-120);
		_credit.y = (_settings.height-20);
	}
		
	if (_title !== null)
	{
		_title.width = _settings.width;
		_title.x = 0;
	}

	if (_timelineControls !== null)
	{
		var verticalCenter: Number = ((_settings.height/2)-40);
		_timelineControls.y = (_settings.height-50);
	}

}

private function getLatLonViewingArea(): Object
{
	var topLeftScreen: Point = new Point(0, 0);
	var bottomRightScreen: Point = new Point(_settings.width, _settings.height);
		
	var topLeftLatLon: Object = getLatLonFromXY(topLeftScreen, _xYToLatLonMatrix);
	var bottomRightLatLon: Object = getLatLonFromXY(bottomRightScreen, _xYToLatLonMatrix);

	var result: Object = {
		topLat: topLeftLatLon.lat,
		leftLon: topLeftLatLon.lon,
		bottomLat: bottomRightLatLon.lat,
		rightLon: bottomRightLatLon.lon
	};
	
	return result;
}

private function removeAllInlays(): void
{
	_inlays	= [];
	
	_dirty = true;
}

private function removeAllWays(): void
{
	_ways = {};
	_nodes = {};

  	_tagMap = {};
	_lastSetWayIds = {};
	
	_dirty = true;
}

private function getAllInlays(): Array
{
	var result: Array = [];
	
	for each(var inlay: Object in _inlays)
	{
		var topLeftScreen: Point = getXYFromLatLon(inlay.worldTopLeftLatLon, _latLonToXYMatrix);
		var bottomRightScreen: Point = getXYFromLatLon(inlay.worldBottomRightLatLon, _latLonToXYMatrix);
		
		var outputInlay: Object =
		{
			left_x: topLeftScreen.x,
			top_y: topLeftScreen.y,
			right_x: bottomRightScreen.x,
			bottom_y: bottomRightScreen.y,
			top_lat: inlay.topLat,
			left_lon: inlay.leftLon,
			bottom_lat: inlay.bottomLat,
			right_lon: inlay.rightLon
		};

		result.push(outputInlay);
	}
	
	return result;
}

private function addPopup(lat: Number, lon: Number, text: String): void
{
	var popup: Object =
	{
		originLatLon: { lat: lat, lon: lon },
		text: text
	};

	popup.uiComponent = new TextArea();
	popup.uiComponent.htmlText = text;

	popup.uiComponent.wordWrap = false;
	popup.uiComponent.horizontalScrollPolicy = "ScrollPolicy.OFF";
	popup.uiComponent.verticalScrollPolicy = "ScrollPolicy.OFF";
	
	var dropShadowFilter: DropShadowFilter = new DropShadowFilter (5,65,0x000000,0.3,5,10,2,3,false,false,false);
	popup.uiComponent.filters = [dropShadowFilter];

	viewer.addChild(popup.uiComponent);
	
	var screenPos: Point = getXYFromLatLon(popup.originLatLon, _latLonToXYMatrix);
	
	popup.uiComponent.validateNow();
	
	popup.uiComponent.width = (popup.uiComponent.textWidth+10);
	popup.uiComponent.height = (popup.uiComponent.textHeight+20);
	popup.uiComponent.x = (screenPos.x-popup.uiComponent.width);
	popup.uiComponent.y = (screenPos.y-popup.uiComponent.height);

	if (popup.uiComponent.x<0)
	{
		popup.uiComponent.x = 0;
		popup.uiComponent.wordWrap = true;
		popup.uiComponent.width = screenPos.x;
		popup.uiComponent.validateNow();
		popup.uiComponent.height = (popup.uiComponent.textHeight+5);
	}
	
	if (popup.uiComponent.y<0)
	{
		popup.uiComponent.y = 0;
	}

	if ((popup.uiComponent.y+popup.uiComponent.height)>_settings.height)
	{
		popup.uiComponent.y = (_settings.height-popup.uiComponent.height);		
	}

	_popups.push(popup);
}

private function removeAllPopups(): void
{
	for each (var popup: Object in _popups)
	{
		viewer.removeChild(popup.uiComponent);	
	}
	
	_popups = [];
}*/

    this.createURLForTile = function(latIndex, lonIndex, zoomIndex)
    {
        var result = this._settings.map_server_root;
        result += zoomIndex;
        result += '/';
        result += lonIndex;
        result += '/';
        result += latIndex;
        result += '.png';

        return result;	
    };

    this.drawMapTiles = function(canvas, width, height, latLonToXYMatrix, xYToLatLonMatrix)
    {
        var viewingArea = this.calculateViewingArea(width, height, xYToLatLonMatrix);
        
        var wantedTiles = this.prepareMapTiles(viewingArea, latLonToXYMatrix, xYToLatLonMatrix, width, height);

        var areAllLoaded = true;

        for (var currentURLIndex in wantedTiles)
        {
            var currentURL = wantedTiles[currentURLIndex];
            if (!this._mapTiles[currentURL].imageLoader._isLoaded)
                areAllLoaded = false;
        }

        var mapTilesURLs = [];
        if (areAllLoaded)
        {
            mapTilesURLs = wantedTiles;
        }
        else
        {
            for (currentURL in this._mapTiles)
            {
                mapTilesURLs.push(currentURL);
            }
        }

        for (currentURLIndex in mapTilesURLs)
        {
            var currentURL = mapTilesURLs[currentURLIndex];
            
            var tile = this._mapTiles[currentURL];

            if (!viewingArea.intersects(tile.boundingBox))
                continue;

            if (!tile.imageLoader._isLoaded)
                continue;
            
            var screenTopLeft = this.getXYFromLatLon(tile.topLeftLatLon, latLonToXYMatrix);
            var screenBottomRight = this.getXYFromLatLon(tile.bottomRightLatLon, latLonToXYMatrix);
            
            var screenLeft = screenTopLeft.x;
            var screenTop = screenTopLeft.y;
        
            var screenWidth = (screenBottomRight.x-screenTopLeft.x);
            var screenHeight = (screenBottomRight.y-screenTopLeft.y);

            this.drawImage(canvas, tile.imageLoader._image, screenLeft, screenTop, screenWidth, screenHeight);
        }
    };

    this.getTileIndicesFromLatLon = function(lat, lon, zoomLevel)
    {
        var mercatorLatitudeOrigin = this.latitudeToMercatorLatitude(this._settings.map_tile_origin_lat);
        var mercatorLatitudeHeight = this.latitudeToMercatorLatitude(this._settings.world_lat_height+this._settings.map_tile_origin_lat)-mercatorLatitudeOrigin;
        
        var zoomTileCount = (1<<zoomLevel);
        var zoomPixelsPerDegreeLatitude = ((this._settings.map_tile_height/mercatorLatitudeHeight)*zoomTileCount);
        var zoomPixelsPerDegreeLongitude = ((this._settings.map_tile_width/this._settings.world_lon_width)*zoomTileCount);

        var tileWidthInDegrees = (this._settings.map_tile_width/zoomPixelsPerDegreeLongitude);
        var tileHeightInDegrees = (this._settings.map_tile_height/zoomPixelsPerDegreeLatitude);

        var latIndex = ((this.latitudeToMercatorLatitude(lat)-mercatorLatitudeOrigin)/tileHeightInDegrees);
        latIndex = Math.max(latIndex, 0);
        latIndex = Math.min(latIndex, (zoomTileCount-1));
        
        var lonIndex = ((lon-this._settings.map_tile_origin_lon)/tileWidthInDegrees);
        lonIndex = Math.max(lonIndex, 0);
        lonIndex = Math.min(lonIndex, (zoomTileCount-1));
        
        var result = {
            latIndex: latIndex,
            lonIndex: lonIndex
        };
        
        return result;
    };

    this.getLatLonFromTileIndices = function(latIndex, lonIndex, zoomLevel)
    {
        var mercatorLatitudeOrigin = this.latitudeToMercatorLatitude(this._settings.map_tile_origin_lat);
        var mercatorLatitudeHeight = this.latitudeToMercatorLatitude(this._settings.world_lat_height+this._settings.map_tile_origin_lat)-mercatorLatitudeOrigin;
        
        var zoomTileCount = (1<<zoomLevel);
        var zoomPixelsPerDegreeLatitude = ((this._settings.map_tile_height/mercatorLatitudeHeight)*zoomTileCount);
        var zoomPixelsPerDegreeLongitude = ((this._settings.map_tile_width/this._settings.world_lon_width)*zoomTileCount);

        var tileWidthInDegrees = (this._settings.map_tile_width/zoomPixelsPerDegreeLongitude);
        var tileHeightInDegrees = (this._settings.map_tile_height/zoomPixelsPerDegreeLatitude);

        var lat = ((latIndex*tileHeightInDegrees)+mercatorLatitudeOrigin);
        var lon = ((lonIndex*tileWidthInDegrees)+this._settings.map_tile_origin_lon);
        
        var result = {
            lat: this.mercatorLatitudeToLatitude(lat),
            lon: lon
        };
        
        return result;
    };

    this.prepareMapTiles = function(viewingArea, latLonToXYMatrix, xYToLatLonMatrix, width, height)
    {	
        var pixelsPerDegreeLatitude = latLonToXYMatrix.d;
        
        var zoomPixelsPerDegreeLatitude = (this._settings.map_tile_height/this._settings.world_lat_height);
        var zoomLevel = 0;
        while (Math.abs(zoomPixelsPerDegreeLatitude*this._settings.map_tile_match_factor)<Math.abs(pixelsPerDegreeLatitude))
        {
            zoomLevel += 1;
            zoomPixelsPerDegreeLatitude *= 2;	
        }

        var zoomTileCount = (1<<zoomLevel);
        var zoomPixelsPerDegreeLongitude = ((this._settings.map_tile_width/this._settings.world_lon_width)*zoomTileCount);
        
        var tileWidthInDegrees = (this._settings.map_tile_width/zoomPixelsPerDegreeLongitude);
        var tileHeightInDegrees = (this._settings.map_tile_height/zoomPixelsPerDegreeLatitude);

        var start = this.getTileIndicesFromLatLon(viewingArea.bottom(), viewingArea.left(), zoomLevel);
        start.latIndex = Math.floor(start.latIndex);
        start.lonIndex = Math.floor(start.lonIndex);

        var end = this.getTileIndicesFromLatLon(viewingArea.top(), viewingArea.right(), zoomLevel);
        end.latIndex = Math.ceil(end.latIndex);
        end.lonIndex = Math.ceil(end.lonIndex);

        var wantedTiles = [];

        for (var latIndex = start.latIndex; latIndex<=end.latIndex; latIndex+=1)
        {
            for (var lonIndex = start.lonIndex; lonIndex<=end.lonIndex; lonIndex+=1)
            {
                var wantedTile = {};
            
                wantedTile.latIndex = latIndex;
                wantedTile.lonIndex = lonIndex;
                wantedTile.zoomIndex = zoomLevel;
                
                wantedTile.topLeftLatLon = this.getLatLonFromTileIndices(latIndex, lonIndex, zoomLevel);
                wantedTile.bottomRightLatLon = this.getLatLonFromTileIndices((latIndex+1), (lonIndex+1), zoomLevel);

                wantedTile.boundingBox = new Rectangle();			
                wantedTile.boundingBox = this.enlargeBoxToContain(wantedTile.boundingBox, new Point(wantedTile.topLeftLatLon.lon, wantedTile.topLeftLatLon.lat));
                wantedTile.boundingBox = this.enlargeBoxToContain(wantedTile.boundingBox, new Point(wantedTile.bottomRightLatLon.lon, wantedTile.bottomRightLatLon.lat));	
            
                wantedTiles.push(wantedTile);
            }
        }
        
        var result = [];
        
        for (var wantedTileIndex in wantedTiles)
        {
            var wantedTile = wantedTiles[wantedTileIndex];
            
            var wantedURL = this.createURLForTile(wantedTile.latIndex, wantedTile.lonIndex, wantedTile.zoomIndex);
            
            if (!this._mapTiles.hasOwnProperty(wantedURL))
            {
                this._mapTiles[wantedURL] = {};
                
                this._mapTiles[wantedURL].imageLoader = new ExternalImageView(wantedURL, this._settings.map_tile_width, this._settings.map_tile_height, this);
                
                this._mapTiles[wantedURL].topLeftLatLon = wantedTile.topLeftLatLon;
                this._mapTiles[wantedURL].bottomRightLatLon = wantedTile.bottomRightLatLon;
                this._mapTiles[wantedURL].boundingBox = wantedTile.boundingBox;
            }
            
            this._mapTiles[wantedURL].isUsedThisFrame = true;
            
            result.push(wantedURL);
        }
        
        return result;
    }

    this.mercatorLatitudeToLatitude = function(mercatorLatitude) {
        var result = (180/Math.PI) * (2 * Math.atan(Math.exp((mercatorLatitude*2)*Math.PI/180)) - Math.PI/2);
	
        return result;
    };

    this.latitudeToMercatorLatitude = function(latitude) { 
        var result = (180/Math.PI) * Math.log(Math.tan(Math.PI/4+latitude*(Math.PI/180)/2));
	
        return (result/2);
    };

    this.calculateViewingArea = function(width, height, xYToLatLonMatrix)
    {
        var viewingArea = new Rectangle();
        
        var topLeftScreen = new Point(0, 0);
        var bottomRightScreen = new Point(width, height);
            
        var topLeftLatLon = this.getLatLonFromXY(topLeftScreen, xYToLatLonMatrix);
        var bottomRightLatLon = this.getLatLonFromXY(bottomRightScreen, xYToLatLonMatrix);
        
        viewingArea = this.enlargeBoxToContain(viewingArea, new Point(topLeftLatLon.lon, topLeftLatLon.lat));
        viewingArea = this.enlargeBoxToContain(viewingArea, new Point(bottomRightLatLon.lon, bottomRightLatLon.lat));	

        return viewingArea;	
    };

    this.trackMapTilesUsage = function()
    {
        for (var currentURL in this._mapTiles)
        {
            this._mapTiles[currentURL].isUsedThisFrame = false;	
        }	
    };

    this.deleteUnusedMapTiles = function()
    {
        var areAllLoaded = true;

        for (var currentURL in this._mapTiles)
        {
            if (this._mapTiles[currentURL].isUsedThisFrame&&
                !this._mapTiles[currentURL].imageLoader._isLoaded)
                areAllLoaded = false;
        }

        this._mapTilesDirty = false;
        
        if (areAllLoaded)
        {
            for (var currentURL in this._mapTiles)
            {
                if (!this._mapTiles[currentURL].isUsedThisFrame)
                {
                    this._mapTiles[currentURL].imageLoader = null;
                    delete this._mapTiles[currentURL];
                    this._mapTilesDirty = true;
                }	
            }
        }			
    };
/*
private function getValueHeaders(): Array
{
	return _valueHeaders;	
}

private function addPopupAtScreenPosition(x: Number, y: Number, text: String): void
{
	var latLon: Object = getLatLonFromXY(new Point(x, y), _xYToLatLonMatrix);
	
	addPopup(latLon.lat, latLon.lon, text);	
}

private function getCurrentValues(): Array
{
	var currentValues: Array = _valueData;	

	if (_hasTabs)
	{
		var currentTab: String = _tabNames[_selectedTabIndex];
		currentValues = currentValues[currentTab];
	}
	
	if (_hasTime)
	{
		var currentTime: String = _frameTimes[_frameIndex];
		currentValues = currentValues[currentTime];
	}

	return currentValues;
}

private function drawTabsIntoViewer(): void
{
	var tabCount: int = _tabNames.length;
		
	var tabHeight: Number = _settings.tab_height;
	
	var tabTopY: Number;
	if (_settings.title_text!=='')
		tabTopY = (_settings.title_size*1.5);
	else
		tabTopY = 0;
	
	var tabBottomY: Number = (tabTopY+tabHeight);
	
	var graphics: Graphics = viewer.graphics;
	
	var tabLeftX: Number = 0;
	
	for (var tabIndex:int = 0; tabIndex<tabCount; tabIndex+=1)
	{
		var isLast: Boolean = (tabIndex==(tabCount-1));
		var isSelected: Boolean = (tabIndex===_selectedTabIndex);
		var isHovered: Boolean = (tabIndex===_hoveredTabIndex);

		var tabName: String = _tabNames[tabIndex];
		var tabInfo: Object = _tabInfo[tabName];
		
		var textfield:TextField = new TextField;
		textfield.text = tabName;
		var tabWidth: int = (textfield.textWidth+5);		
		textfield.width = tabWidth;
		
		var tabRightX: Number = (tabLeftX+tabWidth);
		var distanceFromEdge: Number = (_settings.width-tabRightX);
		var addExtraTab: Boolean = (isLast&&(distanceFromEdge>50));
		
		if (isLast&&!addExtraTab)
		{
			tabRightX = (_settings.width-1);
			tabWidth = (tabRightX-tabLeftX);
		}

		tabInfo.leftX = tabLeftX;
		tabInfo.rightX = tabRightX;
		tabInfo.topY = tabTopY;
		tabInfo.bottomY = tabBottomY;
		
		if (tabWidth<1)
			continue;
		
		var fillColor: uint;
		if (isSelected)
			fillColor = _settings.title_background_color;
		else if (isHovered)
			fillColor = scaleColorBrightness(_settings.title_background_color, 0.95);
		else
			fillColor = scaleColorBrightness(_settings.title_background_color, 0.9);
		
		graphics.lineStyle();

		graphics.beginFill(fillColor, 1.0);	
		graphics.moveTo(tabLeftX, tabTopY);
		graphics.lineTo(tabRightX, tabTopY);
		graphics.lineTo(tabRightX, tabBottomY);
		graphics.lineTo(tabLeftX, tabBottomY);
		graphics.lineTo(tabLeftX, tabTopY);
		graphics.endFill();

		var bitmapdata:BitmapData = new BitmapData(tabWidth, tabHeight, true, 0x00000000);
		bitmapdata.draw(textfield);
		
		var textMatrix: Matrix = new Matrix();
		textMatrix.translate(tabLeftX, tabTopY);
		
		graphics.beginBitmapFill(bitmapdata, textMatrix);
		graphics.drawRect(tabLeftX, tabTopY, tabWidth, tabHeight);
		graphics.endFill();

		graphics.lineStyle(0, 0x000000, 1.0);
		graphics.moveTo(tabLeftX, tabBottomY);
		graphics.lineTo(tabLeftX, tabTopY);
		graphics.lineTo(tabRightX, tabTopY);
		graphics.lineTo(tabRightX, tabBottomY);
		if (!isSelected)
			graphics.lineTo(tabLeftX, tabBottomY);

		tabLeftX = tabRightX;

		if (addExtraTab)
		{
			tabRightX = (_settings.width-1);
			
			fillColor = scaleColorBrightness(_settings.title_background_color, 0.9);
			
			graphics.beginFill(fillColor, 1.0);	
			graphics.moveTo(tabLeftX, tabTopY);
			graphics.lineTo(tabRightX, tabTopY);
			graphics.lineTo(tabRightX, tabBottomY);
			graphics.lineTo(tabLeftX, tabBottomY);
			graphics.lineTo(tabLeftX, tabTopY);
			graphics.endFill();

			graphics.lineStyle(0, 0x000000, 1.0);
			graphics.moveTo(tabLeftX, tabBottomY);
			graphics.lineTo(tabLeftX, tabTopY);
			graphics.lineTo(tabRightX, tabTopY);
			graphics.lineTo(tabRightX, tabBottomY);
		}
		
	}
	
	graphics.lineStyle(0, 0x000000, 1.0);
	graphics.moveTo(0, tabBottomY);
	graphics.lineTo(0, (_settings.height-1));
	graphics.lineTo((_settings.width-1), (_settings.height-1));
	graphics.lineTo((_settings.width-1), tabBottomY);
}

private function scaleColorBrightness(colorNumber: uint, scale: Number): uint
{
	var alpha: uint = (colorNumber>>24)&0xff;
	var red: uint = (colorNumber>>16)&0xff;
	var green: uint = (colorNumber>>8)&0xff;
	var blue: uint = (colorNumber>>0)&0xff;
	
	var resultAlpha: uint = alpha; // We'll end up with 'illegal' premult color values, but this shouldn't be a proble for our uses
	var resultRed: uint = Math.floor(red*scale);
	var resultGreen: uint = Math.floor(green*scale);
	var resultBlue: uint = Math.floor(blue*scale);
	
	resultRed = Math.max(0, resultRed);
	resultGreen = Math.max(0, resultGreen);
	resultBlue = Math.max(0, resultBlue);
		
	resultRed = Math.min(255, resultRed);
	resultGreen = Math.min(255, resultGreen);
	resultBlue = Math.min(255, resultBlue);
	
	var result: uint =
		(resultAlpha<<24)|
		(resultRed<<16)|
		(resultGreen<<8)|
		(resultBlue<<0);
	
	return result;
}
*/
    this.isEventInTopBar = function(event)
    {
        var hasTitle = (this._settings.title_text!=='');
        
        if ((!hasTitle)&&(!this._hasTabs))
            return false;
        
        var tabHeight = this._settings.tab_height;
        
        var tabTopY;
        if (hasTitle)
            tabTopY = (this._settings.title_size*1.5);
        else
            tabTopY = 0;
        
        var tabBottomY = (tabTopY+tabHeight);
        
        var localPosition = this.getLocalPosition($(event.target), event.pageX, event.pageY);
        
        return (localPosition.y<tabBottomY);
    };

    this.onTopBarClick = function(event)
    {
        var tabIndex = this.getTabIndexFromEvent(event);
        
        if (tabIndex!==-1)
        {
            this._selectedTabIndex = tabIndex;
            this._valuesDirty = true;
            this._dirty = true;
        }
        
        return true;
    };
	
    this.onTopBarDoubleClick = function(event)
    {
        var tabIndex = this.getTabIndexFromEvent(event);
        
        if (tabIndex!==-1)
        {
            this._selectedTabIndex = tabIndex;
            this._valuesDirty = true;
            this._dirty = true;
        }
        
        return true;
    };
	
    this.onTopBarMouseDown = function(event)
    {	
        return true;	
    };

    this.onTopBarMouseUp = function(event)
    {	
        return true;		
    };

    this.onTopBarMouseOver = function(event)
    {
        return true;	
    };

    this.onTopBarMouseOut = function(event)
    {
        return true;	
    };
	
    this.onTopBarMouseMove = function(event)
    {
        var tabIndex = this.getTabIndexFromEvent(event);
        
        this._hoveredTabIndex = tabIndex;
        
        return true;	
    };
	
    this.getTabIndexFromEvent = function(event)
    {
        var localPosition = this.getLocalPosition($(event.target), event.pageX, event.pageY);

        var x = localPosition.x;
        var y = localPosition.y;
        
        for (var tabIndex = 0; tabIndex<this._tabNames.length; tabIndex+=1)
        {
            var tabName = this._tabNames[tabIndex];
            var tabInfo = this._tabInfo[tabName];
            
            if ((x>=tabInfo.leftX)&&
                (x<tabInfo.rightX)&&
                (y>=tabInfo.topY)&&
                (y<tabInfo.bottomY))
                return tabIndex;
        }
        
        return -1;
    };
/*
private function createPointsGrid(viewingArea: Rectangle, latLonToXYMatrix: Matrix): void
{
	if (!_hasPointValues)
		return;

	var blobRadius: Number;
	if (_settings.is_point_blob_radius_in_pixels)
	{	
		var pixelsPerDegreeLatitude: Number = latLonToXYMatrix.d;
		blobRadius = Math.abs(_settings.point_blob_radius/pixelsPerDegreeLatitude);
	}
	else
	{
		blobRadius = _settings.point_blob_radius;	
	}
	var twoBlobRadius: Number = (2*blobRadius);
	var pointBlobValue: Number = _settings.point_blob_value;

	_pointsGrid = new BucketGrid(viewingArea, 64, 64);
	
	var currentValues: Array = getCurrentValues();
	
	var hasValues: Boolean = (_valueColumnIndex!==-1);
	
	var index: int = 0;
	for each (var values: Array in currentValues)
	{
		var lat: Number = values[_latitudeColumnIndex];
		var lon: Number = values[_longitudeColumnIndex];
		var pointValue: Number;
		if (hasValues)
			pointValue = values[_valueColumnIndex];
		else
			pointValue = pointBlobValue;
		
		var boundingBox: Rectangle = new Rectangle(lon-blobRadius, lat-blobRadius, twoBlobRadius, twoBlobRadius);
		
		if (!viewingArea.intersects(boundingBox))
			continue;
		
		var latLon: Object = { 
			pos: new Point(lon, lat),
			index: index,
			value: pointValue
		};
		
		_pointsGrid.insertObjectAt(boundingBox, latLon);
		
		index += 1;
	}		
}

public function drawPointBlobTile(width: Number, 
	height: Number, 
	viewingArea: Rectangle, 
	latLonToXYMatrix: Matrix, 
	xYToLatLonMatrix: Matrix, 
	leftX: int,
	topY: int,
	tileWidth: int, 
	tileHeight: int): void
{
	var bitmapWidth: int = _pointBlobBitmapWidth;
	var bitmapHeight: int = _pointBlobBitmapHeight;
	
	var rightX: int = (leftX+tileWidth);
	var bottomY: int = (topY+tileHeight);
	
	var blobRadius: Number;
	if (_settings.is_point_blob_radius_in_pixels)
	{	
		var pixelsPerDegreeLatitude: Number = latLonToXYMatrix.d;
		blobRadius = Math.abs(_settings.point_blob_radius/pixelsPerDegreeLatitude);
	}
	else
	{
		blobRadius = _settings.point_blob_radius;	
	}
	var twoBlobRadius: Number = (2*blobRadius);
	var blobRadiusSquared: Number = (blobRadius*blobRadius);
	
	if (_settings.is_gradient_value_range_set)
	{
		var minValue: Number = _settings.gradient_value_min;
		var maxValue: Number = _settings.gradient_value_max;	
	}
	else
	{
		minValue = 0;
		maxValue = 1.0;
	}
	var valueScale: Number = (1/(maxValue-minValue));
	
	var hasValues: Boolean = (_valueColumnIndex!==-1);
	
	var leftLon: Number = viewingArea.left;
	var rightLon: Number = viewingArea.right;
	var widthLon: Number = (rightLon-leftLon);
	var stepLon: Number = (widthLon/bitmapWidth);
	
	var topLat: Number = viewingArea.bottom;
	var bottomLat: Number = viewingArea.top;
	
	var topLatMercator: Number = latitudeToMercatorLatitude(topLat);
	var bottomLatMercator: Number = latitudeToMercatorLatitude(bottomLat);
	var heightLat: Number = (bottomLatMercator-topLatMercator);
	var stepLat: Number = (heightLat/bitmapHeight);
	
	var pixelData: ByteArray = new ByteArray();
	
	var zeroColor: uint = getColorForValue(0, minValue, maxValue, valueScale);
	var fullColor: uint = getColorForValue(maxValue, minValue, maxValue, valueScale);
	
	var worldPoint: Point = new Point();
	for (var bitmapY: int = topY; bitmapY<bottomY; bitmapY+=1)
	{
		worldPoint.y = mercatorLatitudeToLatitude(topLatMercator+(stepLat*bitmapY));
		for (var bitmapX: int = leftX; bitmapX<rightX; bitmapX+=1)
		{			
			worldPoint.x = (leftLon+(stepLon*bitmapX));
			
			var candidatePoints: Array = _pointsGrid.getContentsAtPoint(worldPoint);
			
			if (candidatePoints.length<1)
			{
				pixelData.writeUnsignedInt(zeroColor);
				continue;
			}
			
			var value: Number = 0;
			var lerpTotal: Number = 0;
			
			for each (var point: Object in candidatePoints)
			{
				var pos: Point = point.pos;
				var delta: Point = worldPoint.subtract(pos);
				var distanceSquared: Number = ((delta.x*delta.x)+(delta.y*delta.y));
				if (distanceSquared>blobRadiusSquared)
					continue;
				
				var distance: Number = Math.sqrt(distanceSquared);
				var lerp: Number = (1-(distance/blobRadius));
				
				value += (point.value*lerp);
				lerpTotal += lerp;
			}
			
			var color: uint;
			if (hasValues)
			{
				if (lerpTotal>0)
				{
					value = (value/lerpTotal);	
				}
				else
				{
					value = 0;
				}
				
				var alpha: uint = Math.floor(255*(Math.min(lerpTotal, 1.0)));
				
				color = getColorForValue(value, minValue, maxValue, valueScale);
				
				var colorAlpha: uint = (color>>24)&0xff;
				var outputAlpha: uint = ((colorAlpha*alpha)>>8)&0xff;
				
				color = (color&0x00ffffff)|(outputAlpha<<24);
			}
			else
			{
				if (value>=maxValue)
				{
					pixelData.writeUnsignedInt(fullColor);
					continue;
				}
				
				color = getColorForValue(value, minValue, maxValue, valueScale);
			}
			
			pixelData.writeUnsignedInt(color);
		}	
	}
	
	pixelData.position = 0;
	
	_pointBlobBitmap.setPixels(new Rectangle(leftX, topY, tileWidth, tileHeight), pixelData);
}
*/

    // From http://stackoverflow.com/questions/359788/javascript-function-name-as-a-string   
    this.externalInterfaceCall = function(functionName) {
        var args = Array.prototype.slice.call(arguments).splice(2);
        var namespaces = functionName.split(".");
        var func = namespaces.pop();
        var context = window;
        for(var i = 0; i < namespaces.length; i++) {
            context = context[namespaces[i]];
        }
        return context[func].apply(this, args);
    };
    
    this.createCanvas = function(width, height) {
        return $(
            '<canvas '
            +'width="'+width+'" '
            +'height="'+height+'"'
            +'"></canvas>'
        );
    };
    
    this.colorStringFromNumber = function(colorNumber, alpha)
    {
        var red = (colorNumber>>16)&0xff;
        var green = (colorNumber>>8)&0xff;
        var blue = (colorNumber>>0)&0xff;

        if (typeof alpha === 'undefined')
            alpha = 1.0;
            
        var result = 'rgba(';
        result += red;
        result += ',';
        result += green;
        result += ',';
        result += blue;
        result += ',';
        result += alpha;
        result += ')';
        
        return result;
    };
    
    this.drawImage = function(destination, source, x, y, w, h)
    {
        var context = this.beginDrawing(destination);
        context.drawImage(source, x, y, w, h);
        this.endDrawing(context);
    };

    this.fillRect = function(destination, x, y, width, height, color)
    {
        var context = this.beginDrawing(destination);
        context.fillStyle = this.colorStringFromNumber(color);
        context.fillRect(x, y, width, height);
        this.endDrawing(context);
    };

    this.__constructor(canvas);

    return this;
}
