//////////////////////////////////////////////////////////////////////////////

/**
 * The base class of the custom template
 */
class CustomTemplateElement extends HTMLElement {

	/**
	 * The contructor that will create the template clone and attach it to the shadow root
	 * @param {string} templateName 
	 * @param {string} shadowMode 
	 */
	constructor(templateName, shadowMode) {
		super();

		let template = document.getElementById(templateName);
		let templateContent = template.content;
        
		// attach the clone of the template content to the shadow root
		this.myShadowRoot = this.attachShadow({mode: shadowMode});
		this.myShadowRoot.appendChild(templateContent.cloneNode(true));

		// create a custom event
		this.addToContainerEvent = new CustomEvent("addToContainer", {
			bubbles: true,
			cancelable: false,
			detail: {},
		});

		this.addCardToDbEvent = new CustomEvent("addCardToDb", {
			bubbles: true,
			cancelable: false,
			detail: {},
		});

		this.updateCardInDbEvent = new CustomEvent("updateCardInDb", {
			bubbles: true,
			cancelable: false,
			detail: {},
		});

		this.removeCardFromDbEvent = new CustomEvent("removeCardFromDb", {
			bubbles: true,
			cancelable: false,
			detail: {},
		});

		this.addCardContainerToDbEvent = new CustomEvent("addCardContainerToDb", {
			bubbles: true,
			cancelable: false,
			detail: {},
		});
        
		this.updateCardContainerInDbEvent = new CustomEvent("updateCardContainerInDb", {
			bubbles: true,
			cancelable: false,
			detail: {},
		});
        
		this.removeCardContainerFromDbEvent = new CustomEvent("removeCardContainerFromDb", {
			bubbles: true,
			cancelable: false,
			detail: {},
		});

		// attribute name and value
		this.attrNames = new Array();
		this.attrVals = new Array();
	}

	/**
	 * Defer the setting of the attribute until the connectedCallback event
	 * This is to ensure that attributeChangedCallback is called after connectedCallback
	 * @param {string} attrName 
	 * @param {string} attrVal 
	 */
	setAttributeOnConnect(attrName, attrVal) {
		this.attrNames.push(attrName);
		this.attrVals.push(attrVal);
	}

	/**
	 * Once the element is attached to the DOM
	 */
	connectedCallback() {	
		let self = this;

		// listen for this event (whenever a card is added or removed from the container)
		this.myShadowRoot.addEventListener("addToContainer", function (ev) {
			let oldCardContainerElem = document.getElementById( ev.data.oldParentElemId );
			let newCardContainerElem = document.getElementById( ev.data.newParentElemId );
			let cardElemId = ev.data.childElemId;
			let cardElem = document.getElementById( cardElemId );
			
			// addToContainer event will trigger attributeChangedCallback event
			// changing this attribute will trigger attributeChangedCallback of MyCardContainer class
			if(oldCardContainerElem) {
				oldCardContainerElem.setAttribute('removecard', cardElemId);
			}
			if(newCardContainerElem) {
				newCardContainerElem.setAttribute('addcard', cardElemId);	
			}				
		});

		// set the deferred attributes once the element is attached to the DOM
		for (let i = 0, attrLen = this.attrNames.length; i < attrLen; ++i) {
			this.setAttribute(this.attrNames[i], this.attrVals[i]);
		} //end loop
	}

} //end class


//////////////////////////////////////////////////////////////////////////////


/**
 * The main class for the draggable and editable card
 */
class MyCard extends CustomTemplateElement {

	/**
	 * The default constructor
	 */
	constructor() {
		super('card-template', 'open');	
		
		// the parent id (card container) of the card
		this.origParentElemId = null;
		this.parentElemId = null;
        
		// the current card container element (element in the shadow root of MyCardContainer)
		this.currCardContainerElem = null;
		// the current droppable element (where you can place the card)
		this.currDroppableElem = null;
        
		// offset position when moving the card (based on mouse pointer position and the top-left position of the card)
		this.shiftPosX = 0;
		this.shiftPosY = 0;	
		// original position
		this.origPosX = 0;
		this.origPosY = 0;
	}

	/**
	 * Set the 'title' of the container
	 */
	set title(title) {
		let titleElem = this.myShadowRoot.querySelector('.title');
		titleElem.textContent = title;
	}

	/**
	 * Get the 'title' of the card
	 */
	get title() {
		let titleElem = this.myShadowRoot.querySelector('.title');
		return titleElem.textContent;
	}

	/**
	 * Set the 'description' of the card
	 */
	set description(description) {
		let descElem = this.myShadowRoot.querySelector('.description');
		descElem.textContent = description;
	}

	/**
	 * Get the 'description' of the card
	 */
	get description() {
		let descElem = this.myShadowRoot.querySelector('.description');
		return descElem.textContent;
	}

	/**
	 * Set the 'containerid' of the card
	 */
	set containerid(containerid) {
		this.setAttribute('containerid', containerid);
	}
	
	/**
	 * Get the 'containerid' of the card
	 */
	get containerid() {
		return this.hasAttribute('containerid');
	}

	get action() {
		let actionElem = this.myShadowRoot.querySelector('.action');
		return actionElem;
	}
    
	get save() {
		let saveElem = this.myShadowRoot.querySelector('.saveIcon');
		return saveElem;
	}
    
	get saveModify() {
		let saveModifyElem = this.myShadowRoot.querySelector('.saveModifyIcon');
		return saveModifyElem;
	}
    
	get cancel() {
		let cancelElem = this.myShadowRoot.querySelector('.cancelIcon');
		return cancelElem;
	}
    
	/**
	 * Observe these attributes for changes
	 */
	static get observedAttributes() {
		return ['containerid']; 
	}

	/**
	 * Callback once the attribute is added, changed or removed
	 * @param {string} name 
	 * @param {string} oldValue 
	 * @param {string} newValue 
	 */
	attributeChangedCallback(name, oldValue, newValue) {
		console.log('..... attributeChangedCallback');
		console.log(name, oldValue, newValue);
        
		switch (name) {
			case 'containerid':
				console.log('+++++ containerid');
				this.parentElemId = newValue;
				this.origParentElemId = oldValue;
				// manage the link between the card and the container
				this.processCardContainerLink( this.id );
				break;
		}
	}

	/**
	 * Moves the target element
	 * @param {Object} targetElem 
	 * @param {number} pageX 
	 * @param {number} pageY 
	 */
	moveElem(targetElem, pageX, pageY) {
		let posX = pageX - this.shiftPosX;
		let posY = pageY - this.shiftPosY;
		targetElem.style.left = `${posX}px`;
		targetElem.style.top = `${posY}px`;
	}

	/**
	 * Callback once the object being dragged enters a droppable area
	 * @param {Object} elem 
	 */
	enterDroppableArea(elem) {
		// accessing the shadow DOM to modify the style
		this.currCardContainerElem = elem.shadowRoot.querySelector('.cardContainer');
		this.currCardContainerElem.style.opacity = 0.35;		

		this.parentElemId = elem.id;
	}
  
	/**
	 * Callback once the object being dragged leaves a droppable area
	 * @param {Object} elem 
	 */
	leaveDroppableArea(elem) {
		// accessing the shadow DOM to modify the style
		this.currCardContainerElem = elem.shadowRoot.querySelector('.cardContainer');
		this.currCardContainerElem.style.opacity = 1;

		this.parentElemId = this.origParentElemId;
	}

	/**
	 * Callback once the mouse pointer is down
	 * @param {Event} ev 
	 */
	onPointerDown(ev) {
		ev.target.style.position = 'absolute';
		ev.target.style.zIndex = 10;		

		// calculate the offset position based on the mouse position and target top-left position
		let rect = ev.target.getBoundingClientRect();
		this.shiftPosX = ev.clientX - rect.left;
		this.shiftPosY = ev.clientY - rect.top;

		// move the target element
		this.moveElem(ev.target, ev.pageX, ev.pageY);

		// add the pointer move events
		this.addEventListener('pointermove', this.onPointerMove);
		this.addEventListener('mousemove', this.onPointerMove);
	}

	/**
	 * Callback once the mouse pointer is moving
	 * @param {Event} ev 
	 */
	onPointerMove(ev) {
		// move the target element
		this.moveElem(ev.target, ev.pageX, ev.pageY);

		ev.target.style.transform = 'rotate(5deg)';

		// workaroundto get the overlapped element below when dragging an element over it
		ev.target.hidden = true;
		let elemBelow = document.elementFromPoint(ev.clientX, ev.clientY);
		ev.target.hidden = false;
		if(!elemBelow) {
			return false;
		}		
		// droppableElem could become null if the mouse position is not over a droppable element
		let droppableElem = elemBelow.closest('.droppable');

		// toggle between entering and leaving the droppable area
		if(this.currDroppableElem != droppableElem) {
			if(this.currDroppableElem) {
				this.leaveDroppableArea(this.currDroppableElem);
			}
			this.currDroppableElem = droppableElem;
			if(this.currDroppableElem) {
				this.enterDroppableArea(this.currDroppableElem);
			}
		}
	}

	/**
	 * Callback once the mouse pointer is up or out of focus from the object
	 * @param {Event} ev 
	 */
	onPointerUpOut( ev ) {
		// remove the pointer move events
		ev.target.removeEventListener('pointermove', this.onPointerMove);
		ev.target.removeEventListener('mousemove', this.onPointerMove);

		ev.target.style.transform = 'rotate(0deg)';
		ev.target.style.zIndex = 4;
		if ( this.currCardContainerElem ) {
			this.currCardContainerElem.style.opacity = 1;
		}

		// if there is a new parent element id
		if (this.parentElemId !== null) {
			// attach to the new parent if there is a change in parent
			if (this.origParentElemId !== this.parentElemId) {			
				// manage the link between the card and the container
				this.processCardContainerLink(ev.target.id);

				// format id for DB
				let cardIdDbFormat = CommonUtil.convertCardIdToDbFormat(ev.target.id);
				let columnIdDbFormat = CommonUtil.convertContainerIdToDbFormat(this.parentElemId);
				
				// added custom property to the custom event
				this.updateCardInDbEvent.data = {
					id: cardIdDbFormat,
					columnId: columnIdDbFormat,
				}
				// dispatch another event to write to DB (which will bubble up through the DOM)
				this.dispatchEvent(this.updateCardInDbEvent);

			// if there is no change in the parent
			} else {
				// revert to original position
				ev.target.style.left = `${this.origPosX}px`;
				ev.target.style.top = `${this.origPosY}px`;	
			}					
		}
	}

	/**
	 * Manage the link/relationship between the card and the container
	 * @param {string} childId 
	 */
	processCardContainerLink(childId) {
		// added custom property to the custom event
		this.addToContainerEvent.data = {
			oldParentElemId: this.origParentElemId,
			newParentElemId: this.parentElemId,
			childElemId: childId,
		}

		// dispatch the custom event (to be caught by the 'addToContainer' event listener)
		this.myShadowRoot.dispatchEvent(this.addToContainerEvent);
		this.origParentElemId = this.parentElemId;
	}

	/**
	 * Once the element is attached to the DOM
	 */
	connectedCallback() {	
		super.connectedCallback();
		
		this.addEventListener('pointerdown', this.onPointerDown);
		this.addEventListener('pointerup', this.onPointerUpOut);
		this.addEventListener('pointerout', this.onPointerUpOut);

		let self = this;
        
        let cardTitleElem = this.myShadowRoot.querySelector('.title');
        let origTitle = cardTitleElem.textContent;
        
        let cardDescElem = this.myShadowRoot.querySelector('.description');
        let origDesc = cardDescElem.textContent;
        
        let actionElem = this.myShadowRoot.querySelector('.action');
        let saveElem = this.myShadowRoot.querySelector('.saveIcon');
        let saveModElem = this.myShadowRoot.querySelector('.saveModifyIcon');
        let cancelElem = this.myShadowRoot.querySelector('.cancelIcon');
        
		// when the delete card icon is clicked
		let delCardIconElem = this.myShadowRoot.querySelector('.deleteIcon');
		delCardIconElem.addEventListener('click', function(ev) {
			// format id for DB
			let cardIdDbFormat = CommonUtil.convertCardIdToDbFormat( self.id );

			// added custom property to the custom event
			self.removeCardFromDbEvent.data = {
				id: cardIdDbFormat
			}
			// dispatch another event to delete from DB (which will bubble up through the DOM)
			self.dispatchEvent(self.removeCardFromDbEvent);

			// detach the card from the parent element
			let parentElem = document.getElementById(self.origParentElemId);
			parentElem.removecard = self.id;
			// remove the card
			self.remove();			
		});	
        
        // when the expand card icon is clicked
        let expCardIconElem = this.myShadowRoot.querySelector('.expandIcon');
		expCardIconElem.addEventListener('click', function(ev) {
			if ( cardDescElem.style.display == 'block' ) {
				cardDescElem.style.display = 'none';
			} else {
				cardDescElem.style.display = 'block';
			}
		});	
		
		// when the card title is modified
		cardTitleElem.addEventListener('click', function(ev) {            
            // check if it is a new card or added card
            if(saveElem.style.display == "none") {
                actionElem.style.visibility = 'visible';
                saveModElem.style.display = 'block';
                cancelElem.style.display = 'block';
            }
		});

		// when the card description is modified
		cardDescElem.addEventListener('click', function(ev) {
            // check if it is a new card or added card
            if(saveElem.style.display == "none") {
                actionElem.style.visibility = 'visible';
                saveModElem.style.display = 'block';
                cancelElem.style.display = 'block';
            }
		});
        
		saveElem.addEventListener('click', function(ev) {
			// format id for DB
            let hasSameTitle = true;
            
			let cardIdDbFormat = CommonUtil.convertCardIdToDbFormat(self.id);
			let columnIdDbFormat = CommonUtil.convertContainerIdToDbFormat(self.origParentElemId);
            
            let cardTitle = cardTitleElem.textContent.replace(/(\t|\n|\r)/gm, "");
            let cardDescription = cardDescElem.textContent.replace(/(\t|\n|\r)/gm, "");
            
            //check for uniqueness of title
            hasSameTitle = self.searchSameCardTitle(cardTitle, self.id);
			
            if (!hasSameTitle) {
                // added custom property to the custom event
                self.addCardToDbEvent.data = {
                    id: cardIdDbFormat,
                    title: cardTitle,
                    description: cardDescription,
                    columnId: columnIdDbFormat
                }
                // dispatch another event to write to DB (which will bubble up through the DOM)
                self.dispatchEvent(self.addCardToDbEvent);

                // toggle action bar
                actionElem.style.visibility = 'hidden';
                saveElem.style.display = 'none';
                saveModElem.style.display = 'none';
                cancelElem.style.display = 'none';
            }
            else
                alert("Same Title found in other cards! Please write another.");
        });
        
		saveModElem.addEventListener('click', function(ev) {
            let hasSameTitle = true;
            
			// format id for DB
			let cardIdDbFormat = CommonUtil.convertCardIdToDbFormat(self.id);
            
            let cardTitle = cardTitleElem.textContent.replace(/(\t|\n|\r)/gm, "");
            let cardDescription = cardDescElem.textContent.replace(/(\t|\n|\r)/gm, "");
            
            // check for uniqueness of title
            hasSameTitle = self.searchSameCardTitle(cardTitle, self.id);
            
            if (!hasSameTitle) {
                // added custom property to the custom event
                self.updateCardInDbEvent.data = {
                    id: cardIdDbFormat,
                    title: cardTitle,
                    description: cardDescription,
                }
                // dispatch another event to write to DB (which will bubble up through the DOM)
                self.dispatchEvent(self.updateCardInDbEvent);

                actionElem.style.visibility = 'hidden';
                saveElem.style.display = 'none';
                saveModElem.style.display = 'none';
                cancelElem.style.display = 'none';

                origTitle = cardTitleElem.textContent;
                origDesc = cardDescElem.textContent;
            }
            else
                alert("Same Title found in other cards! Please write another.");
		});	
        
		cancelElem.addEventListener('click', function(ev) {
            // toggle action bar
            actionElem.style.visibility = 'hidden';
            saveElem.style.display = 'none';
            saveModElem.style.display = 'none';
            cancelElem.style.display = 'none';
            
            cardTitleElem.textContent = origTitle;
            cardDescElem.textContent = origDesc;
		});	
	}
    
	/**
	 * Search for cards of same title
	 * @param {string} searchTitle
	 */
	searchSameCardTitle(searchTitle, selfId) {
        let hasSameTitle = false;
        
		let elemArr = document.querySelectorAll('.cardElem:not([id="' + selfId + '"])');
		// go through all the cards and check the title name
		elemArr.forEach( function(elem, idx) {
			let titleElem = elem.shadowRoot.querySelector('.title');
			let titleText = titleElem.textContent;

			// remove spaces and new lines
			titleText = titleText.replace(/(\t|\n|\r)/gm, "");
			// set to upper case (toggle case insensitivity)
			titleText = titleText.toUpperCase().trim();
			searchTitle = searchTitle.toUpperCase().trim();

			// check if the title partially contains the search parameter
			if (titleText === searchTitle) {
                hasSameTitle = true;
			}
		});
        return hasSameTitle;
	}

} //end class


//////////////////////////////////////////////////////////////////////////////


/**
 * The class for the card container template
 */
class MyCardContainer extends CustomTemplateElement {

	/**
	 * The default constructor
	 */
	constructor() {
		super('card-container-template', 'open');
		// the list of cards attached to the container
		this.cards = new Map();	
	}

	/**
	 * Set the 'title' of the container
	 */
	set title(title) {
		let titleElem = this.myShadowRoot.querySelector('.cardContainerTitle');
		titleElem.textContent = title;
	}

	/**
	 * Get the 'title' of the container
	 */
	get title() {
		let titleElem = this.myShadowRoot.querySelector('.cardContainerTitle');
		return titleElem.textContent;
	}
    
	/**
	 * Set the 'removecardcontainer' property
	 */
	set removecardcontainer(cardElemId) {
		this.setAttribute('removecardcontainer', cardElemId);
	}
	
	/**
	 * Get the 'removecardcontainer' property
	 */
	get removecardcontainer() {
		return this.hasAttribute('removecardcontainer');
	}

	/**
	 * Set the 'addcard' property
	 */
	set addcard(cardElemId) {
		this.setAttribute('addcard', cardElemId);
	}
	
	/**
	 * Get the 'addcard' property
	 */
	get addcard() {
		return this.hasAttribute('addcard');
	}

	/**
	 * Set the 'removecard' property
	 */
	set removecard(cardElemId) {
		this.setAttribute('removecard', cardElemId);
	}
	
	/**
	 * Get the 'removecard' property
	 */
	get removecard() {
		return this.hasAttribute('removecard');
	}
    
	get save() {
		let saveElem = this.myShadowRoot.querySelector('.cardContainerSaveIcon');
		return saveElem;
	}
    
	get saveModify() {
		let saveModifyElem = this.myShadowRoot.querySelector('.cardContainerSaveModifyIcon');
		return saveModifyElem;
	}
    
	get cancel() {
		let cancelElem = this.myShadowRoot.querySelector('.cardContainerCancelIcon');
		return cancelElem;
	}

	/**
	 * Observe these attributes for changes
	 */
	static get observedAttributes() {
		return ['removecardcontainer', 'addcard',  'removecard']; 
	}

	/**
	 * Callback once the attribute is added, changed or removed
	 * @param {string} name 
	 * @param {string} oldValue 
	 * @param {string} newValue 
	 */
	attributeChangedCallback(name, oldValue, newValue) {}
		switch (name) {
			case 'removecardcontainer':
				this.cards.set(newValue, newValue);				
				break;
			case 'addcard':
				this.cards.set(newValue, newValue);				
				break;
			case 'removecard':	
				this.cards.delete(newValue, newValue);
				break;
		}
		// refresh the positioning of the cards
		this.refreshCardPositions();
	}

	/**
	 * Refresh the card positions within the container
	 */
	refreshCardPositions() {
		let topPosAdjustment = 10;
		
		// container title dimensions
		let cardContainerTitleElem = this.myShadowRoot.querySelector('.cardContainerTitle');
		let cardContainerTitleRect = cardContainerTitleElem.getBoundingClientRect();
		let offsetPosY = cardContainerTitleRect.height + topPosAdjustment;
		
		// card dimensions
		let rect = this.getBoundingClientRect();
		
		let prevCardHeight = 0;
		// go through each card and set the position
		this.cards.forEach( (val, key) => {
			let cardElem = document.getElementById(key);

			// set the position	
			cardElem.origPosX = rect.left;
			cardElem.origPosY = rect.top + prevCardHeight + offsetPosY;		
			cardElem.style.left = `${cardElem.origPosX}px`;
			cardElem.style.top = `${cardElem.origPosY}px`;
			
			cardElem.parentElemId = this.id;
			cardElem.origParentElemId = this.id;

			prevCardHeight += cardElem.clientHeight - topPosAdjustment;	
		});
	}

	/**
	 * Once the element is attached to the DOM
	 */
	connectedCallback() {
		super.connectedCallback();
		
		let self = this;
        
        let cardContainerTitleElem = this.myShadowRoot.querySelector('.cardContainerTitle');
        let origTitle = cardContainerTitleElem.textContent;
        
        let saveElem = this.myShadowRoot.querySelector('.cardContainerSaveIcon');
        let saveModElem = this.myShadowRoot.querySelector('.cardContainerSaveModifyIcon');
        let cancelElem = this.myShadowRoot.querySelector('.cardContainerCancelIcon');
        
        let addCardIconElem = this.myShadowRoot.querySelector('.addCardIcon');

		// when the card container title is modified
		cardContainerTitleElem.addEventListener('click', function(ev) {
            // if card container is new or added
            if(addCardIconElem.style.display == "block") {
                saveModElem.style.display = 'block';
                cancelElem.style.display = 'block';
            }
		});
        
        // when save new card container icon is click
		saveElem.addEventListener('click', function(ev) {
            let hasSameTitle = true;
			// format id for DB
			let columnIdDbFormat = CommonUtil.convertContainerIdToDbFormat(self.id);
            
            let cardContainerTitle = cardContainerTitleElem.textContent.replace(/(\t|\n|\r)/g, "");
            
            // check for uniquess of title
            hasSameTitle = self.searchSameCardContainerTitle(cardContainerTitle, self.id);
			
            if (!hasSameTitle) {
                // added custom property to the custom event
                self.addCardContainerToDbEvent.data = {
                    id: columnIdDbFormat,
                    title: cardContainerTitle,
                }
                // dispatch another event to write to DB (which will bubble up through the DOM)
                self.dispatchEvent(self.addCardContainerToDbEvent);
                console.log(self.addCardContainerToDbEvent);

                // toggle action bar
                saveElem.style.display = 'none';
                saveModElem.style.display = 'none';
                cancelElem.style.display = 'none';

                addCardIconElem.style.display = "block";

                origTitle = cardContainerTitle.textContent;
            }
            else
                alert("Same Title found in other columns! Please write another.");

        });

        // when save modify card container icon is click
		saveModElem.addEventListener('click', function(ev) {
            let hasSameTitle = true;
			// format id for DB
			let columnIdDbFormat = CommonUtil.convertContainerIdToDbFormat(self.id);
            
            let cardContainerTitle = cardContainerTitleElem.textContent.replace(/(\t|\n|\r)/g, "");
            
            // check for uniquess of title
            hasSameTitle = self.searchSameCardContainerTitle(cardContainerTitle, self.id);
			
            if (!hasSameTitle) {
                // added custom property to the custom event
                self.updateCardContainerInDbEvent.data = {
                    id: columnIdDbFormat,
                    title: cardContainerTitle,
                }
                // dispatch another event to write to DB (which will bubble up through the DOM)
                self.dispatchEvent(self.updateCardContainerInDbEvent);
                console.log(self.updateCardContainerInDbEvent);

                saveElem.style.display = 'none';
                saveModElem.style.display = 'none';
                cancelElem.style.display = 'none';

                origTitle = cardContainerTitle.textContent;
            }
            else
                alert("Same Title found in other columns! Please write another.");
		});	
        
        // when the cancel action icon is click
		cancelElem.addEventListener('click', function(ev) {
            // toggle action bar
            saveElem.style.display = 'none';
            saveModElem.style.display = 'none';
            cancelElem.style.display = 'none';
            
            cardContainerTitleElem.textContent = origTitle;
		});
        
		// when the delete card container icon is clicked
		let delCardContainerIconElem = this.myShadowRoot.querySelector('.cardContainerDeleteIcon');
		delCardContainerIconElem.addEventListener('click', function(ev) {
            let proceedRemove = false;
            let columnIdDbFormat = CommonUtil.convertContainerIdToDbFormat( self.id );
            
            if(self.cards.size > 0) {
                if (confirm(cardContainerTitleElem.textContent.trim() + ' contains cards. Cards will be deleted. Confirm?')) {
                    proceedRemove = true;
                }
            }
            else
                proceedRemove = true;
            
            if(proceedRemove) {
                // added custom property to the custom event
                self.removeCardContainerFromDbEvent.data = {
                    id: columnIdDbFormat
                }
                // dispatch another event to delete from DB (which will bubble up through the DOM)
                self.dispatchEvent(self.removeCardContainerFromDbEvent);

                // remove the card container
                self.remove();
                
                // remove all cards belonging to card container
                var cardElements = document.querySelectorAll('.cardElem[containerid="' + `${PREFIX_CONTAINER}` + columnIdDbFormat + '"]');
                console.log("card elements = " + cardElements.length);
                for (var i = 0; i < cardElements.length; i++)
                    cardElements[i].remove();
            }
		});	

		// when the add card icon is clicked
		addCardIconElem.addEventListener('click', function(ev) {
			let cardId = CommonUtil.generateCardId();
            
			// create card
			let cardElem = document.createElement('my-card');
			cardElem.setAttribute('id', cardId);
			cardElem.setAttribute('class', 'cardElem');
            
            let cardTitle = cardElem.title;
            // remove spaces and new lines
			cardTitle = cardTitle.replace(/(\t|\n|\r)/gm, "");
            
            let cardDescription = cardElem.description;
            // remove spaces and new lines
			cardDescription = cardDescription.replace(/(\t|\n|\r)/gm, "");
            
            // toggle action bar
            let actionElem = cardElem.action;
            let saveElem = cardElem.save;
            let cancelElem = cardElem.cancel;
            
            actionElem.style.visibility = "visible";
            saveElem.style.display = "block";
            
			// attach to the board
			let boardElem = document.getElementById('trello');
			boardElem.appendChild(cardElem);
			// add to this card container but not save yet
			self.addcard = cardId;
		});		
	}
    
	/**
	 * Search for card containers of same title
	 * @param {string} searchTitle
	 */
	searchSameCardContainerTitle( searchTitle, selfId ) {
        let hasSameTitle = false;
        
		let elemArr = document.querySelectorAll('my-card-container:not([id="' + selfId + '"])');
		// go through all the card container and check the title name
		elemArr.forEach( function( elem, idx ) {
			let titleElem = elem.shadowRoot.querySelector('.cardContainerTitle');
			let titleText = titleElem.textContent;
			// remove spaces and new lines
			titleText = titleText.replace(/(\t|\n|\r)/gm, "");
			// set to upper case (toggle case insensitivity)
			titleText = titleText.toUpperCase().trim();
			searchTitle = searchTitle.toUpperCase().trim();

			// check if the title partially contains the search parameter
			if (titleText === searchTitle) {
                hasSameTitle = true;
			}
		});
        return hasSameTitle;
	}

} //end class

//////////////////////////////////////////////////////////////////////////////


/**
 * The main card board class
 */
class MyCardBoard extends CustomTemplateElement {

	/**
	 * The default contructor
	 */
	constructor() {
		super('board-template', 'open');
        this.cardContainers = new Map();
	}
    
    set addcardcontainer(containerElemId) {
        this.setAttribute('addcardcontainer', containerElemId);
    }
    
    get addcardcontainer() {
        return this.hasAttribute('addcardcontainer');
    }
    
	connectedCallback() {
        super.connectedCallback();
        
        let self = this;
        
        let addCardContainerIconElem = this.myShadowRoot.querySelector('.addCardContainerIcon');
        addCardContainerIconElem.addEventListener('click', function(ev) {
			let containerId = CommonUtil.generateContainerId();
            
			// create card container
			let cardContainerElem = document.createElement('my-card-container');
			cardContainerElem.setAttribute('id', containerId);
			cardContainerElem.setAttribute('class', 'droppable cardContainerElem');
            
            // toggle action icons
            let saveCardContainerIconElem = cardContainerElem.myShadowRoot.querySelector('.cardContainerSaveIcon');
            saveCardContainerIconElem.style.display = "block";
            let saveModifyCardContainerIconElem = cardContainerElem.myShadowRoot.querySelector('.cardContainerSaveModifyIcon');
            saveModifyCardContainerIconElem.style.display = "none";
            let cancelCardContainerIconElem = cardContainerElem.myShadowRoot.querySelector('.cardContainerCancelIcon');
            cancelCardContainerIconElem.style.display = "none";
            
            let addCardIconElem = cardContainerElem.myShadowRoot.querySelector('.addCardIcon');
            addCardIconElem.style.display = "none";
            
			// attach to the board but not save yet
			let boardElem = document.getElementById('trello');
			boardElem.appendChild(cardContainerElem);
		});	        
	}

} //end class


//////////////////////////////////////////////////////////////////////////////


/**
 * The custom element class for the card search bar
 */
class MyCardSearchBar extends HTMLElement {

	/**
	 * The default contructor
	 */
	constructor() {
		super();

		let shadow = this.attachShadow({mode: 'open'});
		let docFrag = document.createDocumentFragment();

		// CSS style
		let style = document.createElement('style');
		style.textContent = `
			.searchFieldContainer {
				text-align: center;
			}
			.searchField {
				width: 30vw;
				font-size: 2vw;
  				height: 2vw;
				margin: 10px 5px 10px 5px;
				-webkit-border-radius: 50px;
				-moz-border-radius: 50px;
				border-radius: 50px;
				text-align: center;
			}
		`;

		let searchBarContainer = document.createElement('div');
		searchBarContainer.setAttribute('class', 'searchFieldContainer');
		let searchBarForm = document.createElement('form');
		let searchBarInput = document.createElement('input');
		searchBarInput.setAttribute('class', 'searchField');
		searchBarInput.setAttribute('type', 'text');

		searchBarForm.appendChild(searchBarInput);
		searchBarContainer.appendChild(searchBarForm);
		docFrag.appendChild(style);
		docFrag.appendChild(searchBarContainer);
		shadow.appendChild(docFrag);
	}

	/**
	 * Once the element is attached to the DOM
	 */
	connectedCallback() {
		this.addEventListener('keyup', function(ev) {
			// get the value from the text field
			let textFieldElem = this.shadowRoot.querySelector('.searchField');
			let text = textFieldElem.value;

			// search the cards based on the search string
			this.searchCards(text);			
		});
	}

	/**
	 * Search for cards based on the search string
	 * @param {string} searchText 
	 */
	searchCards( searchText ) {
		let elemArr = document.querySelectorAll('.cardElem');
		// go through all the cards and check the title name
		elemArr.forEach( function( elem, idx ) {
			let titleElem = elem.shadowRoot.querySelector('.title');
			let titleText = titleElem.textContent;
			// remove spaces and new lines
			titleText = titleText.replace(/(\t|\n|\r)/gm, "");
			// set to upper case (toggle case insensitivity)
			titleText = titleText.toUpperCase().trim();
			searchText = searchText.toUpperCase().trim();

			// check if the title partially contains the search parameter
			if (titleText.indexOf(searchText) === -1) {
				elem.style.visibility = 'hidden';
			} else {
				elem.style.visibility = 'visible';
			}
		});
	}

} //end class


//////////////////////////////////////////////////////////////////////////////


/**
 * The main card board class
 */
class MyTrello extends HTMLElement {

	/**
	 * The default contructor
	 */
	constructor() {
		super();
	}


} //end class


//////////////////////////////////////////////////////////////////////////////


// register the custom elements
customElements.define('my-card', MyCard);
customElements.define('my-card-container', MyCardContainer);
customElements.define('my-card-board', MyCardBoard);
customElements.define('my-card-search', MyCardSearchBar);

customElements.define('my-trello', MyTrello, {extends: 'div'});