'use strict';

// MODULES //

var _  = require( 'underscore' );
// Import Underscore.string to separate object, because there are conflict functions (include, reverse, contains)
_.str = require( 'underscore.string' );
// Mix in non-conflict functions to Underscore namespace if you want
_.mixin( _.str.exports() );
// All functions, include conflict, will be available through _.str object
_.str.include( 'Underscore.string', 'string' ); // => true

var isArray = require( 'validate.io-array-like' );
var isObject = require( 'validate.io-object' );
var isObjectArray = require( 'validate.io-object-array' );
var isString = require( 'validate.io-string-primitive' );
var isStringArray = require( 'validate.io-string-array' );
var Doc = require( './document.js' );

var natural = require( 'natural' );


// FUNCTIONS //

/**
* FUNCTION: isDoc( val )
*	Validates whether input is an instance of Document by using duck-typing.
*
* @private
* @param {*} val - input value
* @returns {Boolean} `true` if `val` is an object with both a `text` and an `attribute` key
*/
function isDoc( val ) {
	if ( isObject( val ) && val.hasOwnProperty( 'text' ) && val.hasOwnProperty( 'attributes' ) ) {
		return true;
	}
	return false;
} // end FUNCTION isDoc()


/**
* FUNCTION: isDocArray( val )
*	Validates whether input is an array of Document instances via duck-typing.
*
* @private
* @param {*} val - input value
* @returns {Boolean} `true` if `val` is an array of elements that pass the `isDoc` check
*/
function isDocArray( val ) {
	var len;
	var i;
	if ( !isArray( val ) ) {
		return false;
	}
	len = val.length;
	for ( i = 0; i < len; i++ ) {
		if ( !isDoc( val[ i ] ) ) {
			return false;
		}
	}
	return true;
} // end FUNCTION isDocArray()


// CORPUS //

/**
* FUNCTION Corpus( [docs] )
*	Create a corpus of documents.
*
* @constructor
* @param {String|Array} [docs] - string representing a single document or an array of documents
* @returns {Corpus} class instance
*/
function Corpus( docs ) {
	var self = this;
	if ( !( this instanceof Corpus ) ) {
		return new Corpus( docs );
	}

	Object.defineProperty( this, 'nDocs', {
		get: function() {
			return this.documents.length;
		},
		enumerable: true
	});

	this.init = function init( docs ) {
		var arr;
		var len;
		var i;
		// If nothing is passed, treat docs as empty array...
		if ( docs === undefined ) {
			self.documents = [];
		} else {
			if ( isString( docs ) ) {
				self.documents = [ new Doc( docs ) ];
			} else if ( isStringArray( docs ) ) {
				len = docs.length;
				arr = new Array( len );
				for ( i = 0; i < len; i++ ) {
					arr[ i ] = new Doc( docs[ i ] );
				}
				self.documents = arr;
			} else {
				throw new TypeError( 'Constructor expects an array of documents or strings' );
			}
		}
	};

	// Adds a new document to the corpus:
	this.addDoc = function addDoc( doc ) {
		if ( isString( doc ) ) {
			self.documents.push( new Doc( doc ) );
		} else if ( isDoc( doc ) ) {
			self.documents.push( doc );
		} else {
			throw new TypeError( 'Argument has to be a string or document.' );
		}
	};

	/**
	* METHOD: setAttributes( arr )
	*	Sets attributes for the documents in the corpus
	*
	* @param {Array} arr - object array holding document-level attributes
	* @returns {Corpus} corpus reference
	*/
	this.setAttributes = function setAttributes( arr ) {
		var len;
		var i;
		if ( !isObjectArray( arr ) ) {
			throw new TypeError( 'Input argument has to be an object array.' );
		}
		len = arr.length;
		if ( len !== self.nDocs ) {
			throw new Error( 'Length of object array has to equal the number of documents in the corpus.' );
		}
		for ( i = 0; i < len; i++ ) {
			self.documents[ i ].attributes = arr[ i ];
		}
		return self;
	}; // end METHOD setAttributes()

	this.addDocs = function addDocs( docs ) {
		var arr;
		var len;
		var i;
		if ( isStringArray( docs ) ) {
			len = docs.length;
			arr = new Array( len );
			for ( i = 0; i < len; i++ ) {
				arr[ i ] = new Doc( docs[ i ] );
			}
			self.documents = self.documents.concat( arr );
		} else if ( isDocArray( docs ) ) {
			self.documents = self.documents.concat( docs );
		} else {
			throw new TypeError( 'Parameter expects an array of strings or documents.' );
		}
	};



	// strips extra whitespace from docs
	this.clean = function clean() {
		self.apply( function( text ) {
			return _.clean( text );
		});
		return self;
	};

	this.trim = function trim() {
		self.apply( function( text ) {
			return _.trim( text );
		});
		return self;
	};

	this.toString = function toString() {
		var doc;
		var nchars = 500;
		var i;
		var str = '';
		for ( i = 0; i < self.nDocs; i++ ) {
			doc = self.documents[ i ];
			str += 'Document ' + i + ':\n';
			str += '\t' + _(doc.text).truncate( nchars );
			str += '\n' + '\u2500 '.repeat( 16 ) + '\n';
		}
		return str;
	};

	this.toLower = function toLower() {
		self.apply( function( text ) {
			return text.toLowerCase();
		});
		return self;
	};

	this.toUpper = function toUpper() {
		self.apply( function( text ) {
			return text.toUpperCase();
		});
		return self;
	};

	this.stem = function stem( type ) {
		self.apply( function( text ) {
			if ( type === 'Lancaster' ) {
				return natural.LancasterStemmer.stem( text );
			} else {
				return natural.PorterStemmer.stem( text );
			}
		});
		return self;
	};

	this.apply = function apply( FUN ) {
		var i;
		var doc;
		for ( i = 0; i < self.nDocs; i++ ) {
			doc = this.documents[ i ];
			doc.text = FUN( doc.text, doc.attributes, i );
			self.documents[ i ] = doc;
		}
		return self;
	};

	this.map = function map( FUN ) {
		var ret = new Corpus();
		var i;
		var doc;
		for ( i = 0; i < self.nDocs; i++ ) {
			doc = this.documents[ i ];
			doc.text = FUN( doc.text, doc.attributes, i );
				ret.addDoc( doc );
		}
		return ret;
	};

	/**
	* METHOD: filter( FUN )
	*	Filter out documents and return a new corpus.
	*
	* @param {Function} FUN - filter function
	* @returns {Corpus} corpus without documents for which FUN has returned `false`
	*/
	this.filter = function filter( FUN ) {
		var ret = new Corpus();
		var i;
		var bool;
		var doc;
		for ( i = 0; i < self.nDocs; i++ ) {
			doc = this.documents[ i ];
			bool  = FUN( doc.text, doc.attributes, i );
			if ( bool ) {
				ret.addDoc( doc );
			}
		}
		return ret;
	}; // end METHOD filter()

	this.removeWords = function removeWords( words, case_insensitive ) {
		var i;
		var doc;
		for ( doc = 0; doc < self.nDocs; doc++ ) {
			for ( i = 0; i < words.length; i++ ) {
				var options = case_insensitive ? "gi" : "g";
				var myRegExp = new RegExp( "\\b" + words[i] + "\\b", options );
				self.documents[ doc ].text = self.documents[ doc ].text.replace( myRegExp, '' );
			}
		}
		// Clean the newly created extra whitespace...
		self.clean();
		return self;
	};

	this.removeInterpunctuation = function removeInterpunctuation() {
		self.apply( function( text ) {
			return text.replace( /[\!\?\.,;-]/g, ' ' );
		});
		return self;
	};

	this.removeNewlines = function removeNewlines() {
		self.apply( function( text ) {
			return text.replace( /\r?\n|\r/g, ' ' );
		});
		return self;
	};

	this.removeDigits = function removeDigits() {
		self.apply( function( text ) {
			return text.replace( /\d/g, '' );
		});
		return self;
	};

	this.removeInvalidCharacters = function removeInvalidCharacters() {
		self.apply( function( text ) {
			return text.replace( /\uFFFD/g, '' );
		});
		return self;
	};

	self.init( docs );
} // end FUNCTION Corpus()


// EXPORTS //

module.exports = Corpus;