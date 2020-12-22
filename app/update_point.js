function _displayMapUpdatePoint (divtarget) {
	divtarget = typeof divtarget !== 'undefined' ? divtarget : 'app';
	document.getElementById(divtarget).innerHTML = "<div id='map' class='map-wrapper'></div>";
	document.getElementById('home').className = "nav-link flat";
  document.getElementById('leaflet_crud_create').className = "nav-link flat";
  document.getElementById('leaflet_crud_read').className = "nav-link flat";
  document.getElementById('navbarDropdownUpdate').className = "nav-link dropdown-toggle active";
  document.getElementById('leaflet_crud_delete').className = "nav-link flat";
	
	var map, isCollapsed, openStreetMaps;
	if (document.body.clientWidth <= 767) {
		isCollapsed = true;
	} else {
		isCollapsed = false;
	}
	
	var promisePoint = $.ajax({
		url: "./dataservice/read_point.php",
		method: "GET",
		dataType: "json",
		data: {command:"POINT"},
		username: null,
		password: null
	});
	
	var pointObjects = L.geoJson(null, {
		onEachFeature: function (feature, layer) {
			if (feature.properties) {
				layer.on({
					click: function (e) {
						var objectGIDToEdit = feature.properties.gid;
						$("#editobjectgid").val(objectGIDToEdit);
						map.off();
						map.remove();
						_displayMapEditPoint('app',objectGIDToEdit);
					}
				});
			}
		}
	});
	promisePoint.then(function (data) {
		pointObjects.addData(data);
		map.addLayer(pointObjects);
	});

	openStreetMaps = new L.TileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
		minZoom: 3, 
		maxZoom: 20, 
		attribution: 'Map Data &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors.'
	});
	
	map = L.map("map", {
		zoom: 5,
		center: [-2.5918889841, 118.2788085937],
		layers: [openStreetMaps],
		minZoom: 3,
		maxZoom: 20,
		zoomControl: false,
		attributionControl: true
	});
	
	map.setMaxBounds([[-12.6406520507, 94.1211943626], [7.4970404951, 142.1802794933]]);

	var zoomControl = L.control.zoom({
		position: "topleft"
	}).addTo(map);

	var baseLayers = {
		"OpenStreetMap": openStreetMaps
	};
	
	var layerControl = L.control.layers(baseLayers, null,  {
		collapsed: isCollapsed
	}).addTo(map);
	
	var attributionControl = L.control({
		position: "bottomright"
	});
}

/* ============================================= */

function _displayMapEditPoint (divtarget,objectgid) {
	divtarget = typeof divtarget !== 'undefined' ? divtarget : 'app';
	document.getElementById(divtarget).innerHTML = "<div id='map' class='map-wrapper'></div>";
	
	var map, isCollapsed, openStreetMaps;
	if (document.body.clientWidth <= 767) {
		isCollapsed = true;
	} else {
		isCollapsed = false;
	}

	openStreetMaps = new L.TileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
		minZoom: 3, 
		maxZoom: 20, 
		attribution: 'Map Data &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors.'
	});
	
	map = L.map("map", {
		zoom: 5,
		center: [-2.5918889841, 118.2788085937],
		layers: [openStreetMaps],
		minZoom: 3,
		maxZoom: 20,
		zoomControl: false,
		attributionControl: true
	});
	
	// [B, L], [T, R]
	map.setMaxBounds([[-27, 58], [25, 176]]);

	var zoomControl = L.control.zoom({
		position: "topleft"
	}).addTo(map);

	var baseLayers = {
		"OpenStreetMap": openStreetMaps
	};
	
	var layerControl = L.control.layers(baseLayers, null,  {
		collapsed: isCollapsed
	}).addTo(map);
	
	var attributionControl = L.control({
		position: "bottomright"
	});
	
	/* Digitize Function */
	var drawnItems = new L.FeatureGroup();
	map.addLayer(drawnItems);
	
	var promiseObjectEdit = $.ajax({
		url: "./dataservice/read_one_point.php",
		method: "GET",
		dataType: "json",
		data: {command:"POINT",gid:objectgid},
		username: null,
		password: null
	});
	
	promiseObjectEdit.then(function (data) {
		L.geoJson(data, {
			onEachFeature: _onEachFeature
		});
	});
	
	var drawControl = new L.Control.Draw({
		draw: {
			position: 'topleft',
			polyline: false,
			polygon: false,
			rectangle: false,
			circle: false,
			marker: false,
			circlemarker: false
		},
		edit: {
			featureGroup: drawnItems,
			edit: true,
			remove: false
		}
	});
	
	map.addControl(drawControl);
	
	/* edit functions */
	map.on('draw:edited', function (e) {
		var layers = e.layers;
		layers.eachLayer(function(layer) {
			var drawnJSONObject = layer.toGeoJSON();
			var objectGeometry = Terraformer.WKT.convert(drawnJSONObject.geometry);
			var objectGIDToEdit = $("#editobjectgid").val();
			$.ajax({
				url: "./dataservice/update_point.php",
				method: "GET",
				dataType: "json",
				data: {command:"UPDATE",gid:objectGIDToEdit,geometry:objectGeometry},
				success: function (data) {
					if (data.response == "200") {
						map.off();
						map.remove();
						_displayMapRead('app');
					} else {
						map.off();
						map.remove();
						_displayMapRead('app');
						console.log('Update feature failed.');
					}
				},
				username: null,
				password: null
			});
		});
	});
	
	function _onEachFeature (feature, layer) {
		drawnItems.addLayer(layer);
		map.flyTo(new L.LatLng(feature.geometry.coordinates[1],feature.geometry.coordinates[0]), 12);
		if (feature.properties) {
      layer.on({
				click: function (e) {
					var notes = feature.properties.notes;
          _buildDigitiseModalBox('modalform','UPDATE POINT',notes);
        }
      });
    }
	}

	function _buildDigitiseModalBox (targetmodal,context,notes) {
		targetmodal = typeof targetmodal !== 'undefined' ? targetmodal : 'modalbox';
		context = typeof context !== 'undefined' ? context : 'UPDATE POINT';
		notes = typeof notes !== 'undefined' ? notes : '';
		
		var htmlformcomponent = "" +
				"<input type='hidden' id='command' name='command' value='"+context+"'/>" +
				"<table id='feature_data' class='table table-condensed table-bordered table-striped'>" +
					"<thead>" +
						"<tr>" +
							"<th colspan='2' class='text-center'>Feature Data</th>" +
						"</tr>" +
					"</thead>" +
					"<tbody>" +
						"<tr>" +
							"<td class=''>Notes</td>" +
							"<td class='text-center'><input type='text' id='notes' name='notes' class='form-control' value='"+notes+"'/></td>" +
						"</tr>" +
					"</tbody>" +
				"</table>" +
			"";
		var modalfooter = "" +
			"<button type='button' id='canceldigitize' class='btn btn-default' data-dismiss='modal'><i class='fa fa-power-off'></i>&nbsp;Cancel</button>" +
			"<button type='button' id='saveattributedata' class='btn btn-primary'><i class='fa fa-floppy-o'></i>&nbsp;Save</button>" +
			"";
		$("#form_modal_body").empty();
		$("#form_modal_footer").empty().html(modalfooter);
		$("#form_modal_body").removeClass().addClass('modal-body');
		$("#form_modal_size").removeClass().addClass('modal-dialog');
		$("#form_modal_body").html(htmlformcomponent);
		$("#form_modal_label").html("<i class='fa fa-pencil'></i>&nbsp;"+context+"");
		
		$('#'+targetmodal+'').modal({show:true, backdrop:'static', keyboard:false});
	}

	$("#modalform").on('shown.bs.modal', function(){
    _activateFeatureSave();
	});
	
	function _activateFeatureSave () {
		$("#saveattributedata").on('click', function(evt){
			evt.stopImmediatePropagation();
			var gid = $("#editobjectgid").val();
			var noteString = $('#notes').val();
			$.ajax({
				url: "./dataservice/update_data_point.php",
				method: "GET",
				dataType: "json",
				data: {gid:gid, command:"UPDATE", notes:noteString},
				success: function (data) {
					if (data.response=="200") {
						$("#modalform").modal('hide');
						_displayMapRead('app');
					} else {
						$("#modalform").modal('hide');
						console.log('Failed to save.');
					}
				},
				username: null,
				password: null
			});
			return false;
		});
	}
}