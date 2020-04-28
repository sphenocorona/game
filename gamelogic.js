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

// This class contains an array of up to 7 cards
class Hand {
	constructor() {
		this.cards = [];
		this.faceups = [];
	}

	// toAdd is a Card object, and isFaceUp is true/false
	addCard(toAdd, isFaceUp) {
		var i = 0;
		var succeeded = false;

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
			this.faceups[i] = false;
		}
		return true;
	}
}

// Contains a set of 52 cards that get referenced by other stuff. This is used to generate card deals
// The "free" array tracks which cards are actually in play so that duplicates do not occur.
// A value of true indicates that a card is still in the deck, whereas a value of false indicates that
// the card has been dealt somewhere already.
// "count" indicates how many cards are still in the deck and able to be dealt.
class Deck {
	constructor() {
		this.cards = [];
		this.dealt = 0;

		// Generate all 52 cards of the poker deck and add them to the the deck.
		for (var i = 0; i < 52; ++i) 
			this.cards[i] = new Card((i % 13) + 2, Math.floor(i / 13));

		// Shuffle the deck so that the 
		this.shuffle();
	}

	// Deal a card, assuming the deck is already shuffled.
	deal() {
		// Because this is POSTFIX the value BEFORE INCREMENTING is used for array access!
		return this.cards[this.dealt++];
	}

	// Shuffle the cards of the deck using Fischer-Yates shuffle.
	shuffle() {
		var temp = null;
		var j = 0;
		var n = this.cards.length;
		for (let i = 0; i < n - 2; ++i) {
			j = Math.floor(Math.random() * (n - i)) + i;
			temp = this.cards[i];
			this.cards[i] = this.cards[j];
			this.cards[j] = temp;
		}

		this.dealt = 0;

		return true;
	}

	// Reset deck so a new round can be started.
	// Currently just an alias for shuffle function.
	reset() {
		return this.shuffle();
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
class Player {
	constructor(name, chips, mode) {
		this.name = name;
		this.chips = chips;
		this.bet = 0;
		this.cards = new Hand();
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
class Table {
	constructor(deck, startChips) {
		this.deck = deck;
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
		this.deck.shuffle();
		this.pot = 0;

		int len = this.players.length;
		for (let i = 0; i < len; i++) {
			this.players[i].reset();
		}

		this.betCount = this.playerCount;

		return true;
	}

	// Deal cards to the *players*
	dealCards(isFaceUp, firstRecipient) {
		var len = this.players.length;
		var i = 0;
		var curr = null;
		for (i = firstRecipient + 1; i < len; ++i) {
			curr = this.players[i];
			if (curr.stillIn)
				curr.addCard(this.deck.deal(), isFaceUp);
		}
		for (i = 0; i <= firstRecipient; ++i) {
			curr = this.players[i];
			if (curr.stillIn)
				curr.addCard(this.deck.deal(), isFaceUp);
		}
	}

	

}

class TexasTable extends Table {
	constructor(deck, startChips) {
		super(deck, startChips);
		this.button = 0;
	}

	

}