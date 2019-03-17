/*  Copyright (C) 2019  Edward Amgin
    Generated by the Patcher Generator: https://elforko.github.io/generator

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

function injectPatcher(cfg, patchPath)
{
	var outerDiv = document.currentScript.parentNode;

	// TODO check that all cfg vars are defined & valid?
	if(!(cfg===Object(cfg)))
	{alert("injectPatcher error: argument one (cfg) is not an object");return;}

	// Container div
	var div = document.createElement("div");
	div.className = "patcherContainer";

	// File loader
	var loadDiv = document.createElement("div");
	loadDiv.className = "patcherLoadDiv";
	var loadBut = document.createElement("input");
	loadBut.className = "patcherLoadInput";
	loadBut.type = "file";
	loadDiv.appendChild(document.createTextNode(cfg.gamename+" ROM: "));
	loadDiv.appendChild(loadBut);
	div.appendChild(loadDiv);
	loadBut.addEventListener("change", function(e)
	{
		// Get file
		var file = e.target.files[0];
		if (!file) return;

		// Get extension; error if not .smc, .sfc, or .zip
		var ext = loadBut.value.split(".").pop();
		if(ext!="smc"&&ext!="sfc"&&ext!="zip")
		{
			textDiv.innerHTML = "File must have a .smc, .sfc, or .zip extension";
			return;
		}

		// Load file
		var reader = new FileReader();
		reader.onload = function(e)
		{
			function getfailtext(incpatch)
			{
				var ft = "Make sure you're uploading ";
				if(incpatch) ft+= "an unaltered ROM of "+cfg.gamename+",";
				else         ft+= cfg.gamename;
				ft+= " version";
				if(cfg.romlist.length>1) ft+= "s";
				ft+= " ";
				if(cfg.romlist.length==2) {ft+= cfg.romlist[0].ver+" or ";}
				else
				{
					for(var i=0;i<cfg.romlist.length-1;i++){ft+= cfg.romlist[i].ver+", "};
					if(cfg.romlist.length>1) ft+= "or ";
				}
				ft+= cfg.romlist[cfg.romlist.length-1].ver+"."
				return ft;
			}

			// Get smc content, check version, and activate the apply button
			if(ext=="zip")
			{
				textDiv.innerHTML = "Examining zip contents...";

				// Load zip, then check it's contents
				JSZip.loadAsync(file).then(function(z)
				{try{

					var waits = 0;
					z.forEach(function(relativePath, zipEntry)
					{
						// Get file's extension
						var e = zipEntry.name.split(".").pop();

						// Break if not an smc or sfc
						if(e!="smc"&&e!="sfc") return;

						// Get binary for zip entry
						waits++;
						zipEntry.async("uint8Array").then(function(bin)
						{try{

							var ih; // is headered
							[bin, ih] = unheader(bin);
							var cs = checksum(bin);
							var ri = getromlistindex(cfg.romlist, cs);
							if(ri>=0)
							{
								romfound(bin, cfg.romlist[ri].ver, ri, ih, true);
							}
							else
							{
								var uri = getromlistindex(cfg.usrlist, cs);
								if(uri>=0)
								{
									saveDiv.innerHTML = "";
									textDiv.innerHTML = "This appears to be version "+cfg.usrlist[uri].ver+", which is not supported.  "+getfailtext(false);
									applyBut.disabled = true;
								}
								else
								{
									waits--;
									if(waits<=0)
									{
										applyBut.disabled = true;
										saveDiv.innerHTML = "";
										textDiv.innerHTML = ".zip does not contain a valid rom.  "+getfailtext(false);
									}
								}
							}

						}catch(e){console.log(e)}});

					})

				}catch(e){console.log(e)}},function(e)
				{
					textDiv.innerHTML = "Unable to open this .zip";
				});

			}
			else // ext == "smc" or "sfc"
			{
				var bsmc = new Uint8Array(e.target.result); // smc binary
				var ih; // is headered
				[bsmc, ih] = unheader(bsmc);
				var cs = checksum(bsmc);
				var ri = getromlistindex(cfg.romlist, cs);
				if(ri>=0)
				{
					romfound(bsmc, cfg.romlist[ri].ver, ri, ih, false);
				}
				else
				{
					applyBut.disabled = true;
					saveDiv.innerHTML = "";
					var uri = getromlistindex(cfg.usrlist, cs);
					if(uri<0) textDiv.innerHTML = "Invalid ROM.  "+getfailtext(true);
					else      textDiv.innerHTML = "This appears to be version "+cfg.usrlist[uri].ver+" of "+cfg.gamename+", which is not supported.  "+getfailtext(false);
				}

			}

			function unheader(bin)
			{
				var headered = false;
				if(bin.length%1024==512)
				{
					headered = true;
					var cbin = new Uint8Array(bin.length-512);
					for(var i=0;i<cbin.length;i++) cbin[i] = bin[i+512];
					bin = cbin;
				}

				return [bin,headered];
			}

			function getromlistindex(romlist, cs)
			{
				for(var i=0;i<romlist.length;i++)
				{
					if(cs==romlist[i].cs)
					{
						return i;
					}
				}

				return -1;
			}

			function romfound(bin, version, romid, headered, zipped)
			{
				// Display version
				textDiv.innerHTML = cfg.gamename+" Version "+version+" ("+(headered?"":"un")+"headered) Detected";

				// Activate Apply button
				activateApplyBut(bin, romid, headered, zipped);
				saveDiv.innerHTML = "";
			}

		};
		reader.readAsArrayBuffer(file);

	});


	// Ouput Text
	var textDiv = document.createElement("div");
	textDiv.className = "patcherOutputText";
	textDiv.innerHTML = "";
	div.appendChild(textDiv);


	// Apply Button
	var applyBut = document.createElement("button");
	applyBut.className = "patcherApplyButton";
	applyBut.innerHTML = "Apply Patch";
	applyBut.disabled = true;
	div.appendChild(applyBut);
	function activateApplyBut(bsmc, rid, headered, zipped)
	{
		// bsmc:     Uint8Array of the .smc file's binary
		// rid:      cfg.romlist index of loaded rom
		// headered: if loaded rom was headered
		// zipped:   if loaded rom was zipped

		applyBut.disabled = false;

		function error(text)
		{
			textDiv.innerHTML = text;
		}

		function makeipsreq(filename, func)
		{
			var xhr = new XMLHttpRequest();
			xhr.open("GET", filename,true);
			xhr.responseType = "arraybuffer";
			xhr.onload = function(e)
			{
				var arraybuffer = xhr.response;
				if(arraybuffer) func(new Uint8Array(arraybuffer));
				else error("Patcher error: invalid response when downloading patch.");
			};
			xhr.onerror = function(e)
			{
				error("Patcher error: unable to download patch.");
			}
			xhr.send(null);
		}

		applyBut.onclick = function()
		{
			applyBut.disabled = true;
			textDiv.innerHTML = "Downloading and Applying patch...";

			var pid = cfg.romlist[rid].pid;
			var ipsfilename = patchPath+"p"+pid+".ips";

			makeipsreq(ipsfilename, function(bips)
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

				// Check patch integrity
				if(checksum(bips)!=cfg.patchlist[pid].cs)
				{
					error("Patcher error: patch integrity compromised");
					return;
				}

				// Apply ips to loaded smc file (break on failure)
				if(cfg.patchlist[pid].hd) bsmc = addheader(bsmc);
				if(!applyIps(bsmc, bips))
				{
					error("Patcher error: patch application failed");
					return;
				}
				if(cfg.patchlist[pid].hd) bsmc = cutheader(bsmc);

				// Check checksum of result
				if(checksum(bsmc)!=cfg.romlist[rid].pcs)
				{
					error("Patcher error: patched rom integrity compromised");
					return;
				}

				// Attach header if applicable
				var uh = cfg.useheader
				if(uh=="always"||(uh=="default"&&headered)) bsmc = addheader(bsmc);

				// Generate savable blob
				var zs = cfg.zipsave;
				if(zs=="always"||(zs=="default"&&zipped))
				{
					// Generate zip bin
					var z = new JSZip();
					z.file(cfg.prfn+".smc", bsmc);
					z.generateAsync({type:"blob"}).then(function(blob)
					{
						try
						{
							textDiv.innerHTML = "Patching complete!";
							genSaveBut(blob, true);
						}
						catch(e)
						{
							error("Patcher error: jszip failed; see console for error");
							console.log(e);
						}
					});
				}
				else
				{
					textDiv.innerHTML = "Patching complete!";
					genSaveBut(new Blob([bsmc.buffer], { type: "mimeString"}), false);
				}

			});

		}

	}


	// Save Button
	var saveDiv = document.createElement("div");
	saveDiv.className = "patcherSaveAncDiv";
	div.appendChild(saveDiv)
	function genSaveBut(blob, zipped)
	{
		saveDiv.innerHTML = "";
		var saveAnc = document.createElement("a");
		saveAnc.className = "patcherSaveAnchor";
		saveAnc.innerHTML = "Click here to save";
		saveAnc.download = cfg.prfn+(zipped?".zip":".smc");
		saveAnc.href = URL.createObjectURL(blob);
		saveDiv.appendChild(saveAnc);
	}

	// Append to DOM
	outerDiv.appendChild(div);

}


