/*Trello Board Manager
 */
class TrelloBoardMgr {
	constructor() {	
		let self = this;

		this.renderBuffer = document.createDocumentFragment();
		this.serverUrl = 'http://localhost:3000/';

		// listen for this event (whenever a card is added or removed from the container)
		document.body.addEventListener("addCardToDb", function (ev) {
			self.addCardToJsonDb( ev.data );
		});	

		document.body.addEventListener("updateCardInDb", function (ev) {
			self.updateCardInJsonDb( ev.data );
		});
		
		document.body.addEventListener("removeCardFromDb", function (ev) {
			self.removeCardFromJsonDb( ev.data.id );
		});

        document.body.addEventListener("addCardContainerToDb", function (ev) {
			self.addCardContainerToJsonDb( ev.data );
		});	
        
		document.body.addEventListener("updateCardContainerInDb", function (ev) {
			self.updateCardContainerInJsonDb( ev.data );
		});
        
		document.body.addEventListener("removeCardContainerFromDb", function (ev) {
			self.removeCardContainerFromJsonDb( ev.data.id );
		});
	}

	//Insert the card data into the json DB
	addCardToJsonDb( data ) {
		// write data to the server
		let optionObj = {
			method: 'POST', 
			body: JSON.stringify(data),
			headers:{
				'Content-Type': 'application/json'
			}
		};	
		this.accessJsonData( `${this.serverUrl}cards/`, optionObj );
	}

	//Update the card data in the json DB
	updateCardInJsonDb( data ) {
		let cardId = data.id;
		// update data in the server
		let optionObj = {
			method: 'PATCH',
			body: JSON.stringify(data),
			headers:{
				'Content-Type': 'application/json'
			}
		};	
		this.accessJsonData( `${this.serverUrl}cards/${cardId}`, optionObj );
	}

	 //Delete the card data from the json DB
	removeCardFromJsonDb( cardId ) {
		// delete data from the server
		let optionObj = {
			method: 'DELETE'
		};	
		this.accessJsonData( `${this.serverUrl}cards/${cardId}`, optionObj );
	}
    
	//Insert the card container data into the json DB
	addCardContainerToJsonDb( data ) {
		// write data to the server
		let optionObj = {
			method: 'POST', 
			body: JSON.stringify(data),
			headers:{
				'Content-Type': 'application/json'
			}
		};	
		this.accessJsonData( `${this.serverUrl}columns/`, optionObj );
	}

	 //Update the card container data in the json DB
	updateCardContainerInJsonDb( data ) {
		let containerId = data.id;
		// update data in the server
		let optionObj = {
			method: 'PATCH',
			body: JSON.stringify(data),
			headers:{
				'Content-Type': 'application/json'
			}
		};	
		this.accessJsonData( `${this.serverUrl}columns/${containerId}`, optionObj );
	}
    
	 //Delete the card data from the json DB
	removeCardContainerFromJsonDb( containerId ) {
		// delete data from the server
		let optionObj = {
			method: 'DELETE'
		};	

		this.accessJsonData( `${this.serverUrl}columns/${containerId}`, optionObj );
        this.accessJsonData( `${this.serverUrl}cards/columnId=${containerId}`, optionObj );
	}

	 //Fetches and post the json data from the server
	accessJsonData( url, optionsObj = {}, callbackContext = null, callbackFunc = null, callbackArgs = [] ) {
		// fetch data from the server (returns a Promise)
		fetch( url, optionsObj ).then( function( response ) {
			if ( response.ok ) {
				return response.json();
			}
			throw new Error('Response from network failed');
		}).then( function( jsonData ) { 
			if ( callbackFunc && typeof callbackFunc === 'function' ) {
				callbackArgs.push( jsonData );
				// the callback function will process the json data
				callbackFunc.apply( callbackContext, callbackArgs );				
			}
			return jsonData;
		}).catch( function( error ) {
			console.log('Error encountered when fetching json data: ', error.message);
		});
	}

    //Initialize board
	initBoard() {
		const fetchCardsCallback = ( trelloMgr, jsonData ) => {
			for ( let i = 0, dataLen = jsonData.length; i < dataLen; ++i ) {
				let data = jsonData[i];
				// create the cards
				let myCard = document.createElement('my-card');
				myCard.setAttribute('id', `${PREFIX_CARD}${data.id}`);
				myCard.setAttribute('class', 'cardElem');
				myCard.title = data.title;
				myCard.description = data.description;
				//myCard.containerid = data.columnId;
				myCard.setAttributeOnConnect('containerid', `${PREFIX_CONTAINER}${data.columnId}`);
				// attach to the document fragment to minimize reflow and repaint (offscreen rendering)	
				trelloMgr.renderBuffer.appendChild(myCard);
			} //end loop			

			trelloMgr.renderBoard();
		}
	
		// callback function to process column data
		const fetchColsCallback = ( trelloMgr, jsonData ) => {
            // card board
            let myCardBoard = document.createElement('my-card-board');
            myCardBoard.setAttribute('id', 'cardBoard'); 

            // attach to the document fragment to minimize reflow and repaint (offscreen rendering)	
            trelloMgr.renderBuffer.appendChild(myCardBoard);

			for ( let i = 0, dataLen = jsonData.length; i < dataLen; ++i ) {
				let data = jsonData[i];
				// create the card containers
				let myCardContainer = document.createElement('my-card-container');
				myCardContainer.setAttribute('id', `${PREFIX_CONTAINER}${data.id}`);
				myCardContainer.setAttribute('class', 'droppable cardContainerElem');
				myCardContainer.title = data.title;
				// attach to the document fragment to minimize reflow and repaint (offscreen rendering)	
				trelloMgr.renderBuffer.appendChild(myCardContainer);
			} //end loop			

			// fetch data from the server (cards)
			let fetchCallbackArgs = [ trelloMgr ];
			trelloMgr.accessJsonData( `${trelloMgr.serverUrl}cards/`, { method: 'GET'}, trelloMgr, fetchCardsCallback, fetchCallbackArgs );
		}

		// card search
		let myCardSearch = document.createElement('my-card-search');
		myCardSearch.setAttribute('id', 'cardSearch'); 
	  
		// attach to the document fragment to minimize reflow and repaint (offscreen rendering)	
		this.renderBuffer.appendChild(myCardSearch);

		// fetch data from the server (columns)
		let fetchCallbackArgs = [ this ];		
		this.accessJsonData( `${this.serverUrl}columns/`, { method: 'GET'}, this, fetchColsCallback, fetchCallbackArgs );
	}

    renderBoard() {		
		//  the main board 
		let myTrello = document.createElement('my-trello');
        myTrello.setAttribute('id', 'trello');
		myTrello.appendChild(this.renderBuffer);
		document.body.appendChild(myTrello);	
	}

	generateBoard() {
		this.initBoard();
	}
}
