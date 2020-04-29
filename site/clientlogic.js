"use strict";
// var random = require('math-random');

// This object represents a single card in the game.
// The format of the values within is:
// Value: Jack = 11, Queen = 12, King = 13, Ace = 14.
// (do note however that Ace must be also treated as a 1 in order to count A-2-3-4-5 straights)
// Suit: 0 = Spades, 1 = Hearts, 2 = Clubs, 3 = Diamonds, 4+ = dummy card

class Card {
	// Arguments must be two integers.
	constructor(value, suit) {
		this.suit = suit;
		this.value = 0;

		if (suit < 4)
			this.value = value;
	}

	// Returns the difference in values between cards. Positive means this card is higher,
	// negative means other is higher.
	compareTo(otherCard) {
		return this.value - otherCard.value;
	}

	// Determine if this card is an Ace and needs to be handled carefully.
	isAce() {
		if (this.value == 14)
			return true;
		return false;
	}

	isDummy() {
		if (this.suit > 4)
			return true;
	}

	get getValue() {
		return this.value;
	}

	get getSuit() {
		return this.suit;
	}
}

class ClDeck {
	constructor() {
		this.cards = [];
		this.dummy = new Card(7, 0); // Dummy card

		// Generate all 52 cards of the poker deck and add them to the the deck.
		for (var i = 0; i < 52; ++i) 
			this.cards[i] = new Card((i % 13) + 2, Math.floor(i / 13));
	}

	// supply the relevant card item. Probably has the wrong value
	// TODO: check if this is actually correct or not.
	getCard(value, suit) {
		return this.cards[(value - 1) + suit * 13];
	}
}

// This class contains an array of up to 7 cards
class ClHand {
	constructor() {
		// this is ugly but whatever. I guess I could do a loop to fill these but oh well
		this.cards = [null, null, null, null, null, null, null];
		this.faceups = [false, false, false, false, false, false, false];
	}

	// toAdd is a Card object, and isFaceUp is true/false
	addCard(toAdd, isFaceUp) {
		var i = 0;
		var succeeded = false;
		var len = this.cards.length;
		// Look for the first open position to insert the card into
		while (succeeded == false) {
			if (this.cards[i] === null || this.cards[i] === undefined) {
				this.cards[i] = toAdd;
				this.faceups[i] = isFaceUp;
				succeeded = true;
			}
			else
				++i;
		}
		return succeeded;
	}

	// Clear the cards in the hand.
	clearCards() {
		var len = this.cards.length - 1
		for (var i = 0; i < len; ++i) {
			this.cards[i] = null;
			this.faceups[i] = null;
		}
		return true;
	}
}

// This class represents the player's possessions on the board.
// chips represents how much money the player has.
// bet represents how much the player is betting on the current round.
// cards is the player's hand.
// mode is the player's relation to the game:
// 0 for spectating
// 1 for playing (normal)
// 2 for playing (folded)

// There is also mouse position values in case this is represented in the UI, but for now
// they are just dummy variables.
class ClPlayer {
	constructor(name, chips, mode) {
		this.name = name;
		this.chips = chips;
		this.bet = 0;
		this.cards = new ClHand();
		this.mode = mode;
		this.mousex = 0;
		this.mousey = 0;
	}

	// This function is used to *increase* the player's bet, for the purposes of blinds, calls, and raises.
	// The amount fed in is the amount to increase the bet by.
	bet(amount) {
		if (this.chips < amount) {
			this.bet = this.chips;
			this.chips = 0;
		} else {
			this.bet += amount;
			this.chips -= amount;
		}

		return this.bet;
	}

	// Used to award wins to a player
	addChips(amount) {
		this.chips += amount;
		return true;
	}

	// Give a card to the player so they can add it to their hand.
	addCard(toAdd, isFaceUp) {
		return this.cards.addCard(toAdd, isFaceUp);
	}

	// Used to reset the player's current bet and hand after a round is over.
	reset() {
		this.cards.clearCards();
		this.bet = 0;
		if (this.mode != 0)
			this.mode = 1;

		return this.mode;
	}

	updateMousePos(newX, newY) {
		this.mousex = newX;
		this.mousey = newY;
	}

	get nick() {
		return this.name;
	}

	// Used to determine if this player should still be able to bet and recieve cards this round.
	get stillIn() {
		return (this.mode == 1);
	}

	// Used to determine if the player isn't a spectator.
	get isPlaying() {
		return (this.mode > 0);
	}
}


// This class handles most of the actual poker action.
// 'rules' should be an object with a bunch of functions in it that can be called to determine
// things that occur in-game that may vary between poker variants.
class ClTable {
	constructor(deck, startChips) {
		this.players = [];
		this.idToPlayer = {};
		this.playerCount = 0;
		this.pot = 0;
		this.startChips = startChips;
		this.inProgress = false;
		this.betCount = 0; // How many players are still in the hand.
		this.inputWaiting = false;

		for (let i = 0; i < 12; ++i) {
			this.players[i] = null;
		}
	}

	// Clean up stuff after the round is over and prepare for a new round.
	// This does not handle things like awarding chips or determinining who goes first next round.
	cleanup() {
		this.pot = 0;

		int len = this.players.length;
		for (let i = 0; i < len; i++) {
			this.players[i].reset();
		}

		this.betCount = this.playerCount;

		return true;
	}



}