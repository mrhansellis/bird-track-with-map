import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './css/styles.css';
import BirdTrackerService from './js/services/bird-track-service.js';
import GeoCall from './js/services/geoCall.js';
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { Loader } from "@googlemaps/js-api-loader";

// Business Logic

//Variables needed in more than one function
let map;
const google = window.google;
const loader = new Loader({
  apiKey: `${process.env.OTHER_MAPS_KEY}`,
  version: "weekly"
});

let birds = [];
let targetBirdInfo = [];
const birdNameInputElement = document.querySelector("#birdName-input");

function getAPIData(speciesCde = "", location = "") {
  BirdTrackerService.getSpeciescode(speciesCde, location)
    .then(function (birdTrackerResponse) {
      if (birdTrackerResponse instanceof Error) {
        clearResults();
        const errorMessage = `There was a problem accessing the bird data from eBird's API,
        Status Code: ${birdTrackerResponse.message}`;
        throw new Error(errorMessage);
      }
      if (speciesCde === "" && location == "") {
        birdTrackerResponse.forEach((bird, index) => {
          let birdObject = new Object();
          birdObject.comName = bird.comName;
          birdObject.speciesCode = bird.speciesCode;
          birds[index] = birdObject;
        });
      } else {
        if (!birdTrackerResponse.length) {
          clearResults();
          let targetBird = birds.find(birdObject => birdObject.speciesCode === `${speciesCde}`);
          const message = `There hasn't been any recent sighting of "${targetBird.comName}s". Maybe try another birdy.`;
          printError(message);
        } else {
          targetBirdInfo[0] = birdTrackerResponse[0].comName;
          targetBirdInfo[1] = birdTrackerResponse[0].sciName;

          birdTrackerResponse.forEach((bird, index) => {
            let birdObject = new Object();
            birdObject.lat = bird.lat;
            birdObject.lng = bird.lng;
            birdObject.locName = bird.locName;
            birdObject.obsDt = bird.obsDt;
            targetBirdInfo[index + 2] = birdObject;
          });
          displayOutput(targetBirdInfo);
        }
      }
    })
    .catch(function (error) {
      printError(error);
    });
}

//UI Logic

function onKeyInputChange() {

  removeAutoDropDown();
  const filteredBirdNames = [];
  const value = birdNameInputElement.value.toLowerCase();

  if (value.lenght === 0) {
    return;
  }

  if (value.length > 2) {

    birds.forEach((bird, index) => {
      if (bird.comName.toLowerCase().includes(value)) {
        filteredBirdNames[index] = bird.comName;
      }
    });
  }

  createAutoCompleteDropDown(filteredBirdNames);
}

function createAutoCompleteDropDown(nameList) {
  const listElement = document.createElement("ul");
  listElement.className = "autocomplete-list";
  listElement.id = "autocomplete-list";

  nameList.forEach((birdName) => {
    const listItem = document.createElement("li");
    const birdNameBtn = document.createElement("button");
    birdNameBtn.innerHTML = birdName;
    birdNameBtn.addEventListener("click", onBirdButtonClick);
    listItem.appendChild(birdNameBtn);
    listElement.appendChild(listItem);
  });
  document.querySelector("#autocomplete-list-div").appendChild(listElement);
}

function removeAutoDropDown() {
  const listElement = document.querySelector("#autocomplete-list");
  const errorMessage = document.querySelector("#error");

  if (listElement) {
    listElement.remove();
  }
  errorMessage.setAttribute("class", "hide");
}

function onBirdButtonClick(e) {
  e.preventDefault();
  const buttonE1 = e.target;
  birdNameInputElement.value = buttonE1.innerHTML;
  removeAutoDropDown();
}

function displayOutput(birdOutputArray) {
  let bool = Boolean(document.querySelector('div#outputDisplay') === null);
  if (bool) {
    let outputDiv = document.createElement('div');
    outputDiv.setAttribute('id', 'outputDisplay');
    document.querySelector('div#map').append(outputDiv);
  }
  let oldOutputDiv = document.querySelector('div#outputDisplay');
  (document.querySelector('p#error')).innerHTML = '';
  oldOutputDiv.innerText = '';
  let pTag = document.createElement('p');
  pTag.innerHTML = `<p>The species ${birdOutputArray[1]} commonly known as ${birdOutputArray[0]} has been found in the following locations:</p>`;
  // let ulText = document.createElement('ul');
  // //change this to change the number of birds
  // for (let i = 2; i < 7; i++) {
  //   ulText.innerHTML = ulText.innerHTML + `<li> Location: ${birdOutputArray[i]['locName']}</li> <li> Last Seen: ${birdOutputArray[i]['obsDt']}</li> <li> Latitude: ${birdOutputArray[i]['lat']}</li> <li> Longitude: ${birdOutputArray[i]['lng']}</li><br>`;
  // }
  // oldOutputDiv.prepend(pTag);
  // oldOutputDiv.append(ulText);
  // let mapDiv = document.querySelector('div#map');
  // mapDiv.append(oldOutputDiv);
  
  loader.load().then(async ()=> {

  const position = {lat:parseFloat(`${birdOutputArray[2]['lat']}`), lng:parseFloat(`${birdOutputArray[2]['lng']}`)};
  const { Map } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerView } = await google.maps.importLibrary("marker");

  map = new Map(document.getElementById("map"), {
    zoom: 9,
    center: position,
    mapId: "DEMO_MAP_ID"
  });

  const contentString = "That bird was here at this ____ time."
  console.log(contentString);

  const infoWindow = new google.maps.InfoWindow({
    content: contentString,
    disableAutoPan: true
  });

  const labels = birdOutputArray
    .filter(item => typeof item === 'object')
    .map(item => (item.locName));

  console.log(birdOutputArray);

  const locations = birdOutputArray
    .filter(item => typeof item === 'object')
    .map(item => ({lat: item.lat, lng: item.lng}));

  const markers = locations.map((position, i) => {
    const label = labels[i % labels.length];
    const marker = new google.maps.Marker({
      position,
      label,
    });
  
    marker.addListener("click", () => {
      // infoWindow.setContent(label);
      infoWindow.open({
        anchor: marker,
        map
      });
    });
    return marker;
  });

  new MarkerClusterer({ markers, map });

  return AdvancedMarkerView;

  });

}

function printError(error) {
  removeAutoDropDown();
  const errorMessage = document.querySelector('#error');
  errorMessage.removeAttribute("class");
  errorMessage.innerText = error;
}

function getSpeciesCode(birdNameInput) {
  let targetBird = birds.find(birdObject => birdObject.comName === `${birdNameInput}`);

  if (typeof targetBird === "undefined") {
    clearResults();
    const errorMessage = `Oops , we don't have "${birdNameInput}" as a common bird name. Please try again.`;
    printError(errorMessage);
  } else {
    return targetBird.speciesCode;
  }
}

function clearResults() {
  let element = document.getElementById("outputDisplay");
  if (typeof (element) !== 'undefined' && element !== null) {
    let outputDiv = document.getElementById("outputDisplay");
    outputDiv.parentNode.removeChild(outputDiv);
  }
}

function handleFormSubmission(event) {
  event.preventDefault();
  const birdNameInput = document.querySelector('#birdName-input').value;
  document.querySelector('#birdName-input').value = null;
  let speciesCode = getSpeciesCode(birdNameInput);
  if (typeof speciesCode !== "undefined") {
    GeoCall.geoGrab('ip', '')
      .then(function (location) {
        getAPIData(speciesCode, location);
      });
      
  
  }
}



//This is where we will need to call google map and full eBird APIs
//maybe we can make separate calls, one possible option is below
// 1.latLang = getlanLat();
// 2. birdlocation = getBirdInfo( speciesCode, latLang)
// 3. display(birdLocation, Latlang)
// 4. other stretch goals

birdNameInputElement.addEventListener("input", onKeyInputChange);

window.addEventListener("load", () => {
  document.getElementById('button').addEventListener("click", handleFormSubmission);
  getAPIData();
});