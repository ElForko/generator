/*  Copyright (C) 2019  Edward Amgin

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.  */

"use strict";

function main()
{
	// Function for creating info popups
	var lastInfo = null;
	function appendInfoToggle(element, text)
	//{{{
	{
		var infoHolder = document.createElement("div");
		infoHolder.style.display = "inline-block";
		infoHolder.style.position = "relative";
		element.appendChild(infoHolder);

		var infoToggle = document.createElement("span");
		infoToggle.style.fontFamily = "sans-serif";
		infoToggle.style.fontSize = "0.8em";
		infoToggle.style.color = "#888";
		infoToggle.style.cursor = "pointer";
		infoToggle.innerHTML = "[<span style=\"color:#0f0;\">?</span>]";
		infoHolder.appendChild(infoToggle);

		var info = document.createElement("div");
		info.style.display = "inline-block";
		info.style.position = "absolute";
		info.style.width = "300px";
		info.style.backgroundColor = "#eee";
		info.style.padding = "7px";
		info.style.borderRadius = "5px";
		info.style.zIndex = "1";
		info.style.visibility = "hidden";
		info.style.cursor = "default";
		info.style.fontSize = "0.8em";
		info.style.fontWeight = "1.0";
		info.style.textAlign = "left";
		info.innerHTML = text;
		var infoClose = document.createElement("div");
		infoClose.style.fontSize = "0.9em";
		infoClose.style.textAlign = "center";
		infoClose.innerHTML = "<br/>Click to close";
		info.appendChild(infoClose);
		infoHolder.appendChild(info);

		infoToggle.addEventListener("click", function()
		{
			if(info.style.visibility=="hidden")
			{
				if(lastInfo) lastInfo.style.visibility = "hidden";
				info.style.visibility = "visible";
				lastInfo = info;
			}
			else info.style.visibility = "hidden";
		});

		info.addEventListener("click", function()
		{
			info.style.visibility = "hidden";
		});
	}
	//}}}

	// Removes invalid filename characters
	function cleanText(text)
	//{{{
	{
		return text.replace(/[^a-zA-Z0-9 \!\@\#\$\%\^\&\(\)\_\-\+\=\{\}\[\]\;\.\,]/g,"");
	}
	//}}}

	var romDict = {}; // Stores md5sums of ROMs that have been loaded, used to detect repeats

	// The div containing the script that called this function
	var outerDiv = document.currentScript.parentNode;

	// Div that holds everything else, and is appended to outer div
	var mainDiv = document.createElement("div");
	mainDiv.style.fontFamily = "monospace";
	mainDiv.style.margin = "0 auto";
	mainDiv.style.width = "700px";
	mainDiv.style.border = "1px solid #888";
	mainDiv.style.padding = "10px";
	mainDiv.style.borderRadius = "5px";

	// Div containing the patchable roms table
	var patchDiv = document.createElement("div");
	patchDiv.style.minHeight = "120px";
	var patchTable = document.createElement("table");
	patchTable.className = "borderedTable";
	patchTable.style.tableLayout = "fixed";
	var appendPatchTable; // defined below
	// Patch Table
	//{{{
	(function()
	{
		// Add Table Header
		//{{{
		(function()
		{
			var etr = document.createElement("tr");
			patchTable.appendChild(etr);
			(function()
			{
				var eth = document.createElement("th");
				eth.appendChild(document.createTextNode("Base ROM "));
				appendInfoToggle(eth, "The ROMs that you want the patcher to recognize.  These can be in .smc, sfc, or .zip format.  These ROMs will NOT be stored in the patcher- these files are only used right now in order to generate meta-data for recognizing ROMs.");
				eth.className = "generatorFileInputColumn";
				etr.appendChild(eth);
			})();
			(function()
			{
				var eth = document.createElement("th");
				eth.className = "generatorVersionColumn";
				eth.appendChild(document.createTextNode("Version "));
				appendInfoToggle(eth, "Version information for the Base ROM, e.g. \"1.0 US\", or \"1.1 JP\".  This will be displayed when the user loads this ROM and the patcher recognizes it.");
				etr.appendChild(eth);
			})();
			(function()
			{
				var eth = document.createElement("th");
				eth.appendChild(document.createTextNode("Patch File "));
				appendInfoToggle(eth, "The Patch file (.ips) to be applied to the base ROM when the patcher recognizses it.  If this patch file expects a headered ROM, make sure that the Base ROM is also headered (if the patch expects an unheadered ROM, make sure the Base ROM is unheadered); see the <a target=\"_blank\" href=\"man.html#supported\">manual</a> for more information.");
				eth.className = "generatorFileInputColumn";
				etr.appendChild(eth);
			})();
			(function()
			{
				var eth = document.createElement("th");
				eth.appendChild(document.createTextNode("Remove"));
				eth.className = "generatorRemoveColumn";
				etr.appendChild(eth);
			})();
		})();
		//}}}

		function addpatchrow()
		//{{{
		{
			clearSave();

			var etr = document.createElement("tr");
			etr.checksum = null;
			etr.rombin = null;
			etr.headered = null;
			etr.romver = "";
			etr.patchbin = null;
			patchTable.appendChild(etr);
			(function()
			{
				var etd = document.createElement("td");
				etr.appendChild(etd);
				etd.style.position = "relative";

				// Add load button
				//{{{
				(function()
				{
					var loadStat = document.createElement("span");
					loadStat.style.fontSize = "0.6em";
					loadStat.style.position = "absolute";
					loadStat.style.right = "0px";
					function waitstat()
					{loadStat.style.backgroundColor = "#ff3"; loadStat.innerHTML = "Analyzing...";}
					function errstat()
					{loadStat.style.backgroundColor = "#f44"; loadStat.innerHTML = "Error";}
					function headstat()
					{loadStat.style.backgroundColor = "#bfb"; loadStat.innerHTML = "Headered";}
					function unheadstat()
					{loadStat.style.backgroundColor = "#bbf"; loadStat.innerHTML = "Unheadered";}

					var loadBut = document.createElement("input");
					loadBut.type = "file";
					loadBut.style.width = "100%";
					loadBut.style.fontSize = "0.7em";
					loadBut.style.textOverflow = "ellipsis";
					etd.appendChild(loadBut);
					etd.appendChild(loadStat);
					loadBut.addEventListener("change", function(e)
					{
						function verify(bin)
						//{{{
						{
							// Determine if headered; remove header if so
							var headered;
							if(bin.length%1024==512)
							{
								headered = true;
								headstat();

								// Cut off header
								var cbin = new Uint8Array(bin.length-512);
								for(var i=0;i<cbin.length;i++) cbin[i] = bin[i+512];
								bin = cbin;
							}
							else
							{
								headered = false;
								unheadstat();
							}

							// Fail if ROM size isn't valid
							if(bin.length%1024!=0)
							{
								errstat();
								alert("Invalid ROM");
								return false;
							}

							var cs = checksum(bin);
							if(romDict[cs]==undefined)
							{
								etr.checksum = cs;
								etr.rombin = bin;
								etr.headered = headered;
								romDict[cs] = {};
								romDict[cs].headered = headered;
							}
							else
							{
								errstat();
								if(headered==romDict[cs].headered) alert("Already loaded this ROM");
								if((!headered)&&romDict[cs].headered) alert("Already loaded a headered version of this ROM.  This isn't necessary; see the DOCO");
								if(headered&&(!romDict[cs].headered)) alert("Already loaded an unheadered version of this ROM.  This isn't necessary; see the DOCO");
								return false;
							}

							return true;

						}
						//}}}

						clearSave();

						// Remove current ROM
						delete romDict[etr.checksum];
						etr.checksum = null;
						etr.rombin = null;

						// Get file
						var file = e.target.files[0];
						if (!file) return;

						// Get extension; error if not .smc, .sfc, or .zip
						var ext = loadBut.value.split(".").pop();
						if(ext!="smc"&&ext!="sfc"&&ext!="zip")
						{
							errstat();
							alert("ROM must be in .smc/.sfc or .zip format");
							return;
						}

						// Check out file
						var reader = new FileReader();
						reader.onload = function(e)
						{

							// Get smc content, check version, and activate the apply button
							if(ext=="zip")
							{

								//{{{

								// Load zip, then check it's contents
								JSZip.loadAsync(file).then(function(z)
								{try{

									waitstat();

									var roms = 0;
									z.forEach(function(relativePath, zipEntry)
									{
										// Get file's extension
										var e = zipEntry.name.split(".").pop();

										// Break if not an smc or sfc
										if(e!="smc"&&e!="sfc") return;

										// Get binary for zip entry
										roms++;
										zipEntry.async("uint8Array").then(function(bin)
										{try{
											
											if(roms==1) verify(bin);
											else if(roms>1)
											{
												errstat();
												alert("Zip contains multiple ROMs.");
												roms = 0; // To prevent repeated warnings
											}

										}catch(e){console.log(e)}});

									})

									if(roms==0)
									{
										errstat();
										alert("zip doesn't appear to contain any valid ROMs.");
									}

								}catch(e){console.log(e)}},function(e)
								{
									errstat();
									alert("Unable to open zip.");
								});
								//}}}

							}
							else // ext == "smc" or "sfc"
							{
								verify(new Uint8Array(e.target.result));
							}

						};
						reader.readAsArrayBuffer(file);

					});
				})();
				//}}}

			})();
			(function()
			{
				var etd = document.createElement("td");
				etr.appendChild(etd);
				var tin = document.createElement("input");
				tin.type = "text";
				tin.maxLength = "10";
				tin.placeholder = "e.g. 1.0 US";
				tin.style.width = "90%";
				tin.style.display = "block";
				tin.style.margin = "0 auto";
				tin.style.fontSize = "0.8em";
				etd.appendChild(tin);
				tin.addEventListener("change",function()
				{
					clearSave();
					etr.romver = tin.value;
				});

			})();
			(function()
			{
				var etd = document.createElement("td");
				etr.appendChild(etd);
				etd.style.position = "relative";

				// Add load button
				//{{{
				(function()
				{
					var loadStat = document.createElement("span");
					loadStat.style.fontSize = "0.6em";
					loadStat.style.position = "absolute";
					loadStat.style.right = "0px";
					function waitstat()
					{loadStat.style.backgroundColor = "#ff3"; loadStat.innerHTML = "Analyzing...";}
					function errstat()
					{loadStat.style.backgroundColor = "#f44"; loadStat.innerHTML = "Error";}
					function goodstat()
					{loadStat.style.backgroundColor = "#bfb"; loadStat.innerHTML = "OK";}

					var loadBut = document.createElement("input");
					loadBut.type = "file";
					loadBut.style.width = "100%";
					loadBut.style.fontSize = "0.7em";
					loadBut.style.textOverflow = "ellipsis";
					etd.appendChild(loadBut);
					etd.appendChild(loadStat);
					loadBut.addEventListener("change", function(e)
					{
						clearSave();

						// Remove current patch
						waitstat();
						etr.patchbin = null;

						// Get file
						var file = e.target.files[0];
						if (!file)
						{
							errstat();
							alert("Not a file");
							return;
						}

						// Get file extension; error if not .ips
						var ext = loadBut.value.split(".").pop();
						if(ext!="ips")
						{
							errstat();
							alert("Patch must be an .ips file");
							return;
						}

						// Save file contents as binary
						var reader = new FileReader();
						reader.onload = function(e)
						{
							goodstat();
							etr.patchbin = new Uint8Array(e.target.result);
						};
						reader.readAsArrayBuffer(file);


					});
				})();
				//}}}

			})();
			(function()
			{
				var etd = document.createElement("td");
				var del = document.createElement("button");
				del.innerHTML = "x";
				del.style.display = "block";
				del.style.backgroundColor = "#f77";
				del.style.margin = "0 auto";
				del.onclick = function()
				{
					if(window.confirm("Remove this ROM entry?"))
					{
						clearSave();
						delete romDict[etr.checksum];
						etr.remove();
					}
				};
				etd.appendChild(del);
				etr.appendChild(etd);
			})();
		}
		//}}}

		appendPatchTable = function()
		{
			addpatchrow();
			var addBut = document.createElement("button");
			addBut.onclick = addpatchrow;
			addBut.innerHTML = "Add supported ROM";
			addBut.style.fontSize = "0.8em";
			patchDiv.appendChild(addBut);
		};

	})();
	//}}}

	// Div containg the unsupported roms table
	var usromsDiv = document.createElement("div");
	usromsDiv.style.minHeight = "120px";
	var usromsTable = document.createElement("table");
	var appendUsromsTable;
	// Unsupported ROMs Table
	//{{{
	(function()
	{
		// Add Table Header
		//{{{
		(function()
		{
			var etr = document.createElement("tr");
			usromsTable.appendChild(etr);
			(function()
			{
				var eth = document.createElement("th");
				eth.appendChild(document.createTextNode("Unsupported ROM "));
				appendInfoToggle(eth, "Versions of the ROM that you <span style='font-weight:bold'>don't</span> have patch files for.  Used for giving specific errors when a user loads an unsupported ROM; see the <a target=\"_blank\" href=\"man.html#unsupported\">manual</a> for more information.");
				eth.className = "generatorFileInputColumn";
				etr.appendChild(eth);
			})();
			(function()
			{
				var eth = document.createElement("th");
				eth.appendChild(document.createTextNode("Version "));
				appendInfoToggle(eth, "Version information for the unsupported ROM, e.g. \"1.0 US\", or \"1.1 JP\".  This will be used in error messages describing why the ROM a user loaded won't work (e.i. \"This is version 1.1 EU of Super Example Man.  You need to load Version 1.0 US\")");
				eth.className = "generatorVersionColumn";
				etr.appendChild(eth);
			})();
			(function()
			{
				var eth = document.createElement("th");
				eth.appendChild(document.createTextNode("Remove"));
				eth.className = "generatorRemoveColumn";
				etr.appendChild(eth);
			})();
		})();
		//}}}

		function addpatchrow()
		//{{{
		{
			clearSave();

			var etr = document.createElement("tr");
			etr.checksum = null;
			etr.rombin = null;
			etr.romver = "";
			usromsTable.appendChild(etr);
			(function()
			{
				var etd = document.createElement("td");
				etr.appendChild(etd);
				etd.style.position = "relative";

				// Add load button
				//{{{
				(function()
				{
					var loadStat = document.createElement("span");
					loadStat.style.fontSize = "0.6em";
					loadStat.style.position = "absolute";
					loadStat.style.right = "0px";
					function waitstat()
					{loadStat.style.backgroundColor = "#ff3"; loadStat.innerHTML = "Analyzing...";}
					function errstat()
					{loadStat.style.backgroundColor = "#f44"; loadStat.innerHTML = "Error";}
					function headstat()
					{loadStat.style.backgroundColor = "#bfb"; loadStat.innerHTML = "Headered";}
					function unheadstat()
					{loadStat.style.backgroundColor = "#bbf"; loadStat.innerHTML = "Unheadered";}

					var loadBut = document.createElement("input");
					loadBut.type = "file";
					loadBut.style.width = "100%";
					loadBut.style.fontSize = "0.7em";
					loadBut.style.textOverflow = "ellipsis";
					etd.appendChild(loadBut);
					etd.appendChild(loadStat);
					loadBut.addEventListener("change", function(e)
					{
						function verify(bin)
						//{{{
						{
							// Determine if headered; remove header if so
							var headered;
							if(bin.length%1024==512)
							{
								headered = true;
								headstat();

								// Cut off header
								var cbin = new Uint8Array(bin.length-512);
								for(var i=0;i<cbin.length;i++) cbin[i] = bin[i+512];
								bin = cbin;
							}
							else
							{
								headered = false;
								unheadstat();
							}

							// Fail if ROM size isn't valid
							if(bin.length%1024!=0)
							{
								errstat();
								alert("Invalid ROM");
								return false;
							}

							var cs = checksum(bin);
							if(romDict[cs]==undefined)
							{
								etr.checksum = cs;
								etr.rombin = bin;
								etr.headered = headered;
								romDict[cs] = {};
								romDict[cs].headered = headered;
							}
							else
							{
								errstat();
								if(headered==romDict[cs].headered) alert("Already loaded this ROM");
								if((!headered)&&romDict[cs].headered) alert("Already loaded a headered version of this ROM.  This isn't necessary; see the DOCO");
								if(headered&&(!romDict[cs].headered)) alert("Already loaded an unheadered version of this ROM.  This isn't necessary; see the DOCO");
								return false;
							}

							return true;

						}
						//}}}

						clearSave();

						// Remove current checksum
						delete romDict[etr.checksum];
						etr.checksum = null;
						etr.rombin = null;

						// Get file
						var file = e.target.files[0];
						if (!file) return;

						// Get extension; error if not .smc, .sfc, or .zip
						var ext = loadBut.value.split(".").pop();
						if(ext!="smc"&&ext!="sfc"&&ext!="zip")
						{
							errstat();
							alert("ROM must be in .smc/.sfc or .zip format");
							return;
						}

						// Check out file
						var reader = new FileReader();
						reader.onload = function(e)
						{

							// Get smc content, check version, and activate the apply button
							if(ext=="zip")
							{

								//{{{

								// Load zip, then check it's contents
								JSZip.loadAsync(file).then(function(z)
								{try{

									waitstat();

									var roms = 0;
									z.forEach(function(relativePath, zipEntry)
									{
										// Get file's extension
										var e = zipEntry.name.split(".").pop();

										// Break if not an smc or sfc
										if(e!="smc"&&e!="sfc") return;

										// Get binary for zip entry
										roms++;
										zipEntry.async("uint8Array").then(function(bin)
										{try{
											
											if(roms==1) verify(bin);
											else if(roms>1)
											{
												errstat();
												alert("Zip contains multiple ROMs.");
												roms = 0; // To prevent repeated warnings
											}

										}catch(e){console.log(e)}});

									})

									if(roms==0)
									{
										errstat();
										alert("zip doesn't appear to contain any valid ROMs.");
									}

								}catch(e){console.log(e)}},function(e)
								{
									errstat();
									alert("Unable to open zip.");
								});
								//}}}

							}
							else // ext == "smc" or "sfc"
							{
								verify(new Uint8Array(e.target.result));
							}

						};
						reader.readAsArrayBuffer(file);

					});
				})();
				//}}}

			})();
			(function()
			{
				var etd = document.createElement("td");
				etr.appendChild(etd);
				var tin = document.createElement("input");
				tin.type = "text";
				tin.maxLength = "10";
				tin.placeholder = "e.g. 1.1 EU";
				tin.style.width = "90%";
				tin.style.display = "block";
				tin.style.margin = "0 auto";
				tin.style.fontSize = "0.8em";
				etd.appendChild(tin);
				tin.addEventListener("change",function()
				{
					clearSave();
					etr.romver = tin.value;
				});

			})();
			(function()
			{
				var etd = document.createElement("td");
				var del = document.createElement("button");
				del.innerHTML = "x";
				del.style.display = "block";
				del.style.backgroundColor = "#f77";
				del.style.margin = "0 auto";
				del.onclick = function()
				{
					if(window.confirm("Remove this ROM entry?"))
					{
						clearSave();
						delete romDict[etr.checksum];
						etr.remove();
					}
				};
				etd.appendChild(del);
				etr.appendChild(etd);
			})();
		}
		//}}}

		appendUsromsTable = function()
		{
			addpatchrow();
			var addBut = document.createElement("button");
			addBut.style.fontSize = "0.8em";
			addBut.onclick = addpatchrow;
			addBut.innerHTML = "Add unsupported ROM";
			usromsDiv.appendChild(addBut);
		};

	})();
	//}}}

	// Div containing the option inputs
	var optionsDiv = document.createElement("div");
	var appendOptions;
	// Options Tables
	//{{{
	(function()
	{
		var tl = document.createElement("table");
		//tl.style.tableLayout = "fixed";
		tl.style.float = "left";
		optionsDiv.appendChild(tl);
		var tr = document.createElement("table");
		//tr.style.float = "left";
		//tr.style.marginLeft = "30px";
		tr.style.float = "right";
		optionsDiv.appendChild(tr);
		var clear = document.createElement("div");
		clear.style.clear = "both";
		optionsDiv.appendChild(clear);

		function addTextOption(table, label, placeholder, required, info, minchars, maxchars, onchange)
		//{{{
		{
			var etr = document.createElement("tr");
			table.appendChild(etr);
			var etdl = document.createElement("td");
			etdl.style.textAlign = "right";
			var etdi = document.createElement("td");
			etr.appendChild(etdl);
			etr.appendChild(etdi);
			etdl.appendChild(document.createTextNode(label+" "));
			appendInfoToggle(etdl, info);
			var tin = document.createElement("input");
			tin.type = "text";
			tin.minLength = minchars;
			tin.maxLength = maxchars;
			tin.size = 28;
			tin.placeholder = placeholder;
			//tin.style.width = "90%";
			tin.style.display = "block";
			tin.style.margin = "0 auto";
			tin.style.fontSize = "0.6em";
			if(required); tin.required = "true";
			etdi.appendChild(tin);
			if(onchange!=undefined) tin.addEventListener("change",function(){onchange(tin.value);});
			tin.addEventListener("change",function(){clearSave()});

			return tin;
		}
		//}}}

		function addSelectOption(table, label, info, options)
		//{{{
		{
			var etr = document.createElement("tr");
			table.appendChild(etr);
			var etdl = document.createElement("td");
			etdl.style.textAlign = "right";
			var etdi = document.createElement("td");
			etr.appendChild(etdl);
			etr.appendChild(etdi);
			etdl.appendChild(document.createTextNode(label+" "));
			appendInfoToggle(etdl, info);
			var sel = document.createElement("select");
			sel.style.fontSize = "0.6em";
			etdi.appendChild(sel);
			for(var i=0;i<options.length;i++)
			{
				var o = document.createElement("option");
				o.innerHTML = options[i][0];
				o.value = options[i][1];
				sel.appendChild(o);
			}
			sel.addEventListener("change",function(){clearSave()});

			return sel;
		}
		//}}}

		appendOptions = function()
		{
			optionsDiv.gamenameEl = addTextOption(tl, "Original Title", "e.g. Chrono Trigger", true, "The name of the original game that the user will be loading a ROM of.",3,40,function(val)
			{
				optionsDiv.gamenameEl.value = cleanText(val);
			});

			optionsDiv.modnameEl = addTextOption(tl, "Mod Title", "e.g. Chrono Trigger EXTREEEME", true, "The full name of your mod.", 3,40,function(val)
			{
				optionsDiv.modnameEl.value = cleanText(val);
				optionsDiv.prfnEl.value = val;
				optionsDiv.prfnEl.dispatchEvent(new Event("change"));
			});

			optionsDiv.prfnEl = addTextOption(tl, "Mod filename", "e.g. ct_Extreme", false, "The filename of modified ROM that the patcher will produce.  The .smc or .zip extensions will be added automatically by the patcher, so don't include them.", 1,40,function(val)
			{
				optionsDiv.prfnEl.value = cleanText(val).replace(/ /g,"_");
			});

			optionsDiv.useheaderEl = addSelectOption(tr, "Attach header?", "Determines if the patched rom is given a header or not.",
					[["Never","never"],
					 ["If user's rom is headered","default"],
					 ["Always","always"]]);

			optionsDiv.zipsaveEl = addSelectOption(tr, "Zip patched ROM?", "Determines if the patcher produces a .zip of the ROM, or gives the user a raw .smc file.",
					[["If user's rom is zipped","default"],
					 ["Never","never"],
					 ["Always","always"]]);
		};

	})();
	//}}}

	// Generate Button
	var generateButton = document.createElement("button");
	generateButton.style.marginTop = "10px";
	generateButton.innerHTML = "Generate Patcher";
	generateButton.addEventListener("click", function()
	//{{{
	{
		function error(text)
		//{{{
		{
			textDiv.innerHTML = text;
		}
		//}}}

		generateButton.disabled = true;

		var configData = (function()
		//{{{
		{
			function addheader(bin)
			{
				var copy = new Uint8Array(bin.length+512);
				for(var i=0;i<bin.length;i++) copy[i+512] = bin[i];
				return copy;
			}

			function cutheader(bin)
			{
				var copy = new Uint8Array(bin.length-512);
				for(var i=0;i<copy.length;i++) copy[i] = bin[i+512];
				return copy;
			}

			var cd = {};
			cd.romList = []; // List of metadata for supported ROMs
			cd.ipsList = []; // List of metadata for patch files
			cd.usrList = []; // List of metadata for unsupported ROMs

			var ipsMap = {}; // Maps ips checksums to indices in ipsList

			// Parse data from supported ROMs table
			//{{{
			var rows = patchTable.children;
			if(rows.length<2)
			{
				error("Supported ROM table is empty!");
				return null;
			}
			for(var i=0;i<rows.length;i++)
			{
				// Skip table header row
				if(rows[i].checksum===undefined) continue;

				var headered = rows[i].headered;
				var rombin = rows[i].rombin;
				var romver = rows[i].romver;
				var patchbin = rows[i].patchbin;

				// Verify row contents
				if(!rombin)
				{
					error("Invalid Base ROM on row "+i+" of the patch table.");
					return null;
				}
				if(!patchbin)
				{
					error("Invalid patch file on row "+i+" of the patch table.");
					return null;
				}
				if(!romver)
				{
					error("Missing Version descriptor on row "+i+" of the patch table.");
					return null;
				}

				// Generate unheadered patched rom, for integrity checksum
				if(headered) var prbin = addheader(rombin);
				else         var prbin = new Uint8Array(rombin);
				if(!applyIps(prbin,patchbin))
				{
					error("Error applying patch to ROM on row "+i+" of the supported ROMs table.");
					return null;
				}
				if(headered) prbin = cutheader(prbin);

				// Get patch index in ipsList, and add patch to list if unadded
				var patchcs = checksum(patchbin);
				if(ipsMap[patchcs]===undefined)
				{
					var pid = cd.ipsList.push({cs:patchcs,hd:headered,pbin:patchbin})-1;
					ipsMap[patchcs] = pid;
				}
				else
				{
					var pid = ipsMap[patchcs];
				}

				// Add rom data to romList
				cd.romList.push({cs:checksum(rombin),ver:romver,pid:pid,pcs:checksum(prbin)});

			}
			//}}}

			// Parse data from unsupported ROMs table
			//{{{
			rows = usromsTable.children;
			for(var i=0;i<rows.length;i++)
			{

				// Skip table header row
				if(rows[i].checksum===undefined) continue;

				var rombin = rows[i].rombin;
				var romver = rows[i].romver;

				// Verify row contents
				if((!rombin)&&(!romver)) continue; // Skip if entire row left unaltered
				if(!rombin)
				{
					error("Invalid ROM on row "+i+" of the unsupported ROMs table.");
					return null;
				}
				if(!romver)
				{
					error("Missing Version descriptor on row "+i+" of the unsupported ROMs table.");
					return null;
				}

				// Cut off header if present
				if(rombin.length%1024!=0)
				{
					if(rombin.length%1024!=512)
					{
						// Filesize is off, all SNES roms shoud be %512==0 in size
						error("Invalid ROM on row "+i+" of the unsupported ROMs table.");
						return null;
					}

					var copy = new Uint8Array(rombin.length-512);
					for(var i=0;i<copy.length;i++) copy[i] = rombin[i+512];
					rombin = copy;
				}

				// Add rom data to usrList
				cd.usrList.push({cs:checksum(rombin),ver:romver});

			}
			//}}}

			// Parse option fields
			cd.gamename = cleanText(optionsDiv.gamenameEl.value);
			cd.modname = cleanText(optionsDiv.modnameEl.value);
			cd.useheader = cleanText(optionsDiv.useheaderEl.value);
			cd.zipsave = optionsDiv.zipsaveEl.value;
			cd.prfn = optionsDiv.prfnEl.value;
			if(!cd.gamename)
			{
				error("Original title must be specified.");
				return null;
			}
			if(!cd.modname)
			{
				error("Mod's title must be specified.");
				return null;
			}
			if(!cd.prfn)
			{
				cd.prfn = cd.gamename;
			}
			cd.prfn = cd.prfn.replace(/ /g,"_");

			return cd;

		})();
		//}}}
		if(configData==null) return;

		// Generate zip
		//{{{
		(function()
		{
			function makereq(filename, func)
			//{{{
			{
				var xhr = new XMLHttpRequest();
				xhr.open("GET", filename,true);
				xhr.responseType = "arraybuffer";
				xhr.onload = function(e)
				{
					var arraybuffer = xhr.response;
					if(arraybuffer) func(new Uint8Array(arraybuffer));
					else error("Generator error: failed download of file "+filename+".");
				};
				xhr.onerror = function(e)
				{
					error("Generator error: unable to download file "+filename+".");
				}
				xhr.send(null);
			}
			//}}}

			var z = new JSZip();

			// Fetch external files
			var p = z.folder("patcher");
			var files = ["main.js","csmd5.js","ips.js","patcher.css","jszip/jszipmin.js"];
			var left = files.length;
			for(var i=0;i<files.length;i++) (function()
			{
				var ci = i; // closured index
				makereq("patcher/"+files[ci],function(bin)
				{
					p.file(files[ci], bin);
					left--;
					if(left<=0)
					{
						makezip();
					}
				});
			})();

			// Build & attach generated files
			var acronym = (function()
			//{{{
			{
				var a = "";

				var s = configData.modname.replace(/[^a-zA-Z0-9 ]/g,"").replace(/ +/g," ");
				var sp = s.split(" ");
				if(sp.length>2)
				{
					var len = sp.length<6?sp.length:6;
					for(var i=0;i<len;i++)
					{
						a+= sp[i][0];
					}
				}
				else
				{
					var s = s.replace(/ /g,"");
					a = s.substr(0,6);
				}
				if(/^[0-9]/.test(a) || a.length<1) a = "m"+a;
				if(a.length>6) a = a.substr(0,6);
				return a;
			})();
			//}}}
			var indextext = (function()
			//{{{
			{
				var modname = configData.modname.replace(/&/g,"&amp;");
				var gamename = configData.gamename.replace(/&/g,"&amp;");

				var t = "";
				t+= "<!DOCTYPE html>\n";
				t+= "<!--\n";
				t+= "    Copyright (C) 2019  Edward Amgin\n";
    			t+= "    Generated by the Patcher Generator: https://elforko.github.io/generator\n";
				t+= "    \n";
				t+= "    This program is free software: you can redistribute it and/or modify\n";
				t+= "    it under the terms of the GNU General Public License as published by\n";
				t+= "    the Free Software Foundation, either version 3 of the License, or\n";
				t+= "    (at your option) any later version.\n";
				t+= "    \n";
				t+= "    This program is distributed in the hope that it will be useful,\n";
				t+= "    but WITHOUT ANY WARRANTY; without even the implied warranty of\n";
				t+= "    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the\n";
				t+= "    GNU General Public License for more details.\n";
				t+= "    \n";
				t+= "    You should have received a copy of the GNU General Public License\n";
				t+= "    along with this program.  If not, see <https://www.gnu.org/licenses/>.  */\n";
				t+= "-->\n";
				t+= "<html>\n";
				t+= "<head>\n";
				t+= "	<title>"+modname+" Autopatcher Test</title>\n";
				t+= "	<meta charset=\"utf-8\"/>\n";
				t+= "	<script src=\"patcher/ips.js\"></script>\n";
				t+= "	<script src=\"patcher/csmd5.js\"></script>\n";
				t+= "	<script src=\"patcher/jszip/jszipmin.js\"></script>\n";
				t+= "	<script src=\"patcher/main.js\"></script>\n";
				t+= "	<link href=\"patcher/patcher.css\" rel=\"stylesheet\"/>\n";
				t+= "	<script src=\""+acronym+"cfg.js\"></script>\n";
				t+= "</head>\n";
				t+= "<body>\n";
				t+= "	<h5 style=\"text-align:center;\">"+modname+" Autopatcher</h5>\n";
				t+= "	<p style=\"text-align:center;font-family:monospace;\">Load a headered or unheadered ROM of "+gamename+" (.smc, .sfc, or .zip) to get started</p>\n";
				t+= "	<div><script>injectPatcher("+acronym+"cfg,\"patches/\");</script></div>\n";
				t+= "</body>\n";
				t+= "</html>";
				return t;
			})();
			//}}}
			var cfgtext = (function()
			//{{{
			{
				var t = "";
				var n = acronym+"cfg";
				var rl = configData.romList;
				var pl = configData.ipsList;
				var ul = configData.usrList;

				t+= "var "+n+" = {};\n";
				t+= n+".gamename = \""+configData.gamename+"\";\n";
				t+= n+".modname = \""+configData.modname+"\";\n";
				t+= n+".prfn = \""+configData.prfn+"\";\n";
				t+= n+".useheader = \""+configData.useheader+"\";\n";
				t+= n+".zipsave = \""+configData.zipsave+"\";\n";

				t+= n+".romlist = [";
				for(var i=0;i<rl.length;i++)
				{
					
					t+= "{cs:\""+rl[i].cs+"\",";
					t+= "ver:\""+rl[i].ver+"\",";
					t+= "pid:"+rl[i].pid+",";
					t+= "pcs:\""+rl[i].pcs+"\"}";
					if(i<rl.length-1) t+= ",";
				}
				t+="];\n";

				t+= n+".usrlist = [";
				for(var i=0;i<ul.length;i++)
				{
					
					t+= "{cs:\""+ul[i].cs+"\",";
					t+= "ver:\""+ul[i].ver+"\"}";
					if(i<ul.length-1) t+= ",";
				}
				t+="];\n";

				t+= n+".patchlist = [";
				for(var i=0;i<pl.length;i++)
				{
					
					t+= "{cs:\""+pl[i].cs+"\",";
					t+= "hd:"+pl[i].hd+"}";
					if(i<pl.length-1) t+= ",";
				}
				t+="];\n";

				return t;
			})();
			//}}}
			z.file("index.html", indextext);
			z.file(acronym+"cfg.js", cfgtext);

			// Attach loaded patch files
			var pf = z.folder("patches");
			for(var i=0;i<configData.ipsList.length;i++)
			{ pf.file("p"+i+".ips", configData.ipsList[i].pbin); }

			function makezip()
			{

				z.generateAsync({type:"blob"}).then(function(blob)
				{
					try
					{
						textDiv.innerHTML = "Patcher generation complete!";
						genSaveBut(blob, configData.prfn+"_Patcher.zip");
					}
					catch(e)
					{
						error("Generator error: jszip failed; see console for error");
						console.log(e);
					}
				});
			}

		})();
		//}}}

	});
	//}}}

	// Output Text
	var textDiv = document.createElement("div");
	textDiv.innerHTML = "";
	textDiv.style.minHeight = "30px";
	usromsTable.className = "borderedTable";
	usromsTable.style.tableLayout = "fixed";

	// Save Button
	var saveDiv = document.createElement("div");
	saveDiv.style.minHeight = "20px";
	function genSaveBut(blob, name)
	//{{{
	{
		saveDiv.innerHTML = "";
		var saveAnc = document.createElement("a");
		saveAnc.innerHTML = "Save Patcher";
		saveAnc.download = name;
		saveAnc.href = URL.createObjectURL(blob);
		saveAnc.style.padding = "3px"
		saveAnc.style.backgroundColor = "#ddf"
		saveAnc.style.border = "1px solid #00f"
		saveAnc.style.borderRadius = "3px"
		saveDiv.appendChild(saveAnc);
	}
	//}}}
	function clearSave()
	{
		textDiv.innerHTML = "";
		saveDiv.innerHTML = "";
		generateButton.disabled = false;
	}

	// Flesh out DOM structure and append to outer div
	mainDiv.appendChild(patchDiv);
	patchDiv.appendChild(patchTable);
	appendPatchTable();
	mainDiv.appendChild(usromsDiv);
	usromsDiv.appendChild(usromsTable);
	appendUsromsTable();
	mainDiv.appendChild(optionsDiv);
	appendOptions();
	mainDiv.appendChild(generateButton);
	mainDiv.appendChild(textDiv);
	mainDiv.appendChild(saveDiv)
	outerDiv.appendChild(mainDiv);

}


