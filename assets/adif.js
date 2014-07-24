var ADIF = {
	parse_adi : function (string) {
		var result = {
			header : {},
			records : []
		};

		var match, header = true;
		var current = string.charAt(0) === '<' ? {} : result.header;
		while (string.length) {
			if ( (match = /^[^<]*<(\w+):(\d+)(?::([^>]+))?>/.exec(string)) ) {
				string = string.substring(match[0].length);
				var field = match[1].toLowerCase(), length = parseInt(match[2], 10), type = match[3];
				var data  = string.substring(0, length);
				string = string.substring(length);
				// console.log([match[0].length, field, length, type, data]);
				current[ field ] = data;
			} else
			if ( (match = /^[^<]*<eoh>[^<]*/i.exec(string)) ) {
				header = false;
				string = string.substring(match[0].length);
				current = {};
			} else
			if ( (match = /^[^<]*<eor>[^<]*/i.exec(string)) ) {
				string = string.substring(match[0].length);
				result.records.push(current);
				current = {};
			} else {
				throw "unexpected character: " + string.substring(0, 10);
			}
		}

		return result;
	},

	parse_adx : function () {
		throw "not implemented";
	}
};

ADIF.QSO_FIELDS = [
  {
    "enum": "",
    "type": "MultilineString",
    "name": "ADDRESS"
  },
  {
    "enum": "",
    "type": "IntlMultilineString",
    "name": "ADDRESS_INTL"
  },
  {
    "name": "AGE",
    "type": "Number",
    "enum": ""
  },
  {
    "type": "Number",
    "name": "A_INDEX",
    "enum": ""
  },
  {
    "name": "ANT_AZ",
    "type": "Number",
    "enum": ""
  },
  {
    "enum": "",
    "type": "Number",
    "name": "ANT_EL"
  },
  {
    "type": "Enumeration",
    "name": "ANT_PATH",
    "enum": "Ant Path"
  },
  {
    "type": "Enumeration",
    "name": "ARRL_SECT",
    "enum": "ARRL Section"
  },
  {
    "enum": "Sponsored Award",
    "name": "AWARD_SUBMITTED",
    "type": "SponsoredAwardList"
  },
  {
    "enum": "Sponsored Award",
    "name": "AWARD_GRANTED",
    "type": "SponsoredAwardList"
  },
  {
    "type": "Enumeration",
    "name": "BAND",
    "enum": "Band"
  },
  {
    "enum": "Band",
    "name": "BAND_RX",
    "type": "Enumeration"
  },
  {
    "name": "CALL",
    "type": "String",
    "enum": ""
  },
  {
    "enum": "",
    "name": "CHECK",
    "type": "String"
  },
  {
    "name": "CLASS",
    "type": "String",
    "enum": ""
  },
  {
    "type": "Date",
    "name": "CLUBLOG_QSO_UPLOAD_DATE",
    "enum": ""
  },
  {
    "enum": "QSO Upload Status",
    "type": "Enumeration",
    "name": "CLUBLOG_QSO_UPLOAD_STATUS"
  },
  {
    "enum": "function of STATE",
    "type": "Enumeration",
    "name": "CNTY"
  },
  {
    "enum": "",
    "name": "COMMENT",
    "type": "String"
  },
  {
    "type": "IntlString",
    "name": "COMMENT_INTL",
    "enum": ""
  },
  {
    "name": "CONT",
    "type": "Enumeration",
    "enum": "Continent"
  },
  {
    "enum": "",
    "type": "String",
    "name": "CONTACTED_OP"
  },
  {
    "type": "String",
    "name": "CONTEST_ID",
    "enum": "Contest ID"
  },
  {
    "name": "COUNTRY",
    "type": "String",
    "enum": ""
  },
  {
    "type": "IntlString",
    "name": "COUNTRY_INTL",
    "enum": ""
  },
  {
    "enum": "",
    "type": "Number",
    "name": "CQZ"
  },
  {
    "enum": "Credit\n\nAward  (deprecated)",
    "type": "CreditList\n\nAwardList  (deprecated)",
    "name": "CREDIT_SUBMITTED"
  },
  {
    "type": "CreditList\n\nAwardList  (deprecated)",
    "name": "CREDIT_GRANTED",
    "enum": "Credit\n\nAward  (deprecated)"
  },
  {
    "enum": "",
    "name": "DISTANCE",
    "type": "Number"
  },
  {
    "name": "DXCC",
    "type": "Enumeration",
    "enum": "Country Code"
  },
  {
    "type": "String",
    "name": "EMAIL",
    "enum": ""
  },
  {
    "name": "EQ_CALL",
    "type": "String",
    "enum": ""
  },
  {
    "enum": "",
    "name": "EQSL_QSLRDATE",
    "type": "Date"
  },
  {
    "enum": "",
    "type": "Date",
    "name": "EQSL_QSLSDATE"
  },
  {
    "enum": "QSL Rcvd",
    "type": "Enumeration",
    "name": "EQSL_QSL_RCVD"
  },
  {
    "type": "Enumeration",
    "name": "EQSL_QSL_SENT",
    "enum": "QSL Sent"
  },
  {
    "type": "String",
    "name": "FISTS",
    "enum": ""
  },
  {
    "type": "String",
    "name": "FISTS_CC",
    "enum": ""
  },
  {
    "name": "FORCE_INIT",
    "type": "Boolean",
    "enum": ""
  },
  {
    "name": "FREQ",
    "type": "Number",
    "enum": ""
  },
  {
    "type": "Number",
    "name": "FREQ_RX",
    "enum": ""
  },
  {
    "name": "GRIDSQUARE",
    "type": "GridSquare",
    "enum": ""
  },
  {
    "type": "String",
    "name": "GUEST_OP",
    "enum": ""
  },
  {
    "enum": "",
    "type": "Date",
    "name": "HRDLOG_QSO_UPLOAD_DATE"
  },
  {
    "enum": "QSO Upload Status",
    "type": "Enumeration",
    "name": "HRDLOG_QSO_UPLOAD_STATUS"
  },
  {
    "enum": "",
    "name": "IOTA",
    "type": "String"
  },
  {
    "enum": "",
    "type": "String",
    "name": "IOTA_ISLAND_ID"
  },
  {
    "type": "Number",
    "name": "ITUZ",
    "enum": ""
  },
  {
    "type": "Number",
    "name": "K_INDEX",
    "enum": ""
  },
  {
    "type": "Location",
    "name": "LAT",
    "enum": ""
  },
  {
    "enum": "",
    "name": "LON",
    "type": "Location"
  },
  {
    "type": "Date",
    "name": "LOTW_QSLRDATE",
    "enum": ""
  },
  {
    "enum": "",
    "name": "LOTW_QSLSDATE",
    "type": "Date"
  },
  {
    "enum": "QSL Rcvd",
    "type": "Enumeration",
    "name": "LOTW_QSL_RCVD"
  },
  {
    "type": "Enumeration",
    "name": "LOTW_QSL_SENT",
    "enum": "QSL Sent"
  },
  {
    "type": "Number",
    "name": "MAX_BURSTS",
    "enum": ""
  },
  {
    "name": "MODE",
    "type": "Enumeration",
    "enum": "Mode"
  },
  {
    "name": "MS_SHOWER",
    "type": "String",
    "enum": ""
  },
  {
    "enum": "",
    "name": "MY_CITY",
    "type": "String"
  },
  {
    "type": "IntlString",
    "name": "MY_CITY_INTL",
    "enum": ""
  },
  {
    "enum": "function of MY_STATE",
    "type": "Enumeration",
    "name": "MY_CNTY"
  },
  {
    "type": "String",
    "name": "MY_COUNTRY",
    "enum": "Country"
  },
  {
    "enum": "Country",
    "type": "IntlString",
    "name": "MY_COUNTRY_INTL"
  },
  {
    "enum": "",
    "type": "Number",
    "name": "MY_CQ_ZONE"
  },
  {
    "enum": "Country Code",
    "name": "MY_DXCC",
    "type": "Enumeration"
  },
  {
    "enum": "",
    "name": "MY_FISTS",
    "type": "String"
  },
  {
    "name": "MY_GRIDSQUARE",
    "type": "GridSquare",
    "enum": ""
  },
  {
    "enum": "",
    "type": "String",
    "name": "MY_IOTA"
  },
  {
    "type": "String",
    "name": "MY_IOTA_ISLAND_ID",
    "enum": ""
  },
  {
    "enum": "",
    "name": "MY_ITU_ZONE",
    "type": "Number"
  },
  {
    "name": "MY_LAT",
    "type": "Location",
    "enum": ""
  },
  {
    "enum": "",
    "name": "MY_LON",
    "type": "Location"
  },
  {
    "name": "MY_NAME",
    "type": "String",
    "enum": ""
  },
  {
    "enum": "",
    "name": "MY_NAME_INTL",
    "type": "IntlString"
  },
  {
    "name": "MY_POSTAL_CODE",
    "type": "String",
    "enum": ""
  },
  {
    "enum": "",
    "name": "MY_POSTAL_CODE_INTL",
    "type": "IntlString"
  },
  {
    "name": "MY_RIG",
    "type": "String",
    "enum": ""
  },
  {
    "type": "IntlString",
    "name": "MY_RIG_INTL",
    "enum": ""
  },
  {
    "name": "MY_SIG",
    "type": "String",
    "enum": ""
  },
  {
    "type": "IntlString",
    "name": "MY_SIG_INTL",
    "enum": ""
  },
  {
    "enum": "",
    "name": "MY_SIG_INFO",
    "type": "String"
  },
  {
    "enum": "",
    "name": "MY_SIG_INFO_INTL",
    "type": "IntlString"
  },
  {
    "name": "MY_SOTA_REF",
    "type": "SOTARef",
    "enum": ""
  },
  {
    "name": "MY_STATE",
    "type": "Enumeration",
    "enum": "function of MY_COUNTRY"
  },
  {
    "type": "String",
    "name": "MY_STREET",
    "enum": ""
  },
  {
    "name": "MY_STREET_INTL",
    "type": "IntlString",
    "enum": ""
  },
  {
    "type": "SecondarySubdivisionList",
    "name": "MY_USACA_COUNTIES",
    "enum": ""
  },
  {
    "enum": "",
    "name": "MY_VUCC_GRIDS",
    "type": "GridSquareList"
  },
  {
    "type": "String",
    "name": "NAME",
    "enum": ""
  },
  {
    "type": "IntlString",
    "name": "NAME_INTL",
    "enum": ""
  },
  {
    "enum": "",
    "name": "NOTES",
    "type": "MultilineString"
  },
  {
    "enum": "",
    "type": "IntlMultilineString",
    "name": "NOTES_INTL"
  },
  {
    "enum": "",
    "type": "Number",
    "name": "NR_BURSTS"
  },
  {
    "name": "NR_PINGS",
    "type": "Number",
    "enum": ""
  },
  {
    "enum": "",
    "name": "OPERATOR",
    "type": "String"
  },
  {
    "type": "String",
    "name": "OWNER_CALLSIGN",
    "enum": ""
  },
  {
    "enum": "",
    "name": "PFX",
    "type": "String"
  },
  {
    "enum": "",
    "type": "String",
    "name": "PRECEDENCE"
  },
  {
    "type": "Enumeration",
    "name": "PROP_MODE",
    "enum": "Propagation"
  },
  {
    "enum": "",
    "type": "String",
    "name": "PUBLIC_KEY"
  },
  {
    "name": "QRZCOM_QSO_UPLOAD_DATE",
    "type": "Date",
    "enum": ""
  },
  {
    "enum": "QSO Upload Status",
    "name": "QRZCOM_QSO_UPLOAD_STATUS",
    "type": "Enumeration"
  },
  {
    "enum": "",
    "name": "QSLMSG",
    "type": "MultilineString"
  },
  {
    "enum": "",
    "name": "QSLMSG_INTL",
    "type": "IntlMultilineString"
  },
  {
    "name": "QSLRDATE",
    "type": "Date",
    "enum": ""
  },
  {
    "type": "Date",
    "name": "QSLSDATE",
    "enum": ""
  },
  {
    "type": "Enumeration",
    "name": "QSL_RCVD",
    "enum": "QSL Rcvd"
  },
  {
    "type": "Enumeration",
    "name": "QSL_RCVD_VIA",
    "enum": "QSL Via"
  },
  {
    "enum": "QSL Sent",
    "name": "QSL_SENT",
    "type": "Enumeration"
  },
  {
    "enum": "QSL Via",
    "name": "QSL_SENT_VIA",
    "type": "Enumeration"
  },
  {
    "type": "String",
    "name": "QSL_VIA",
    "enum": ""
  },
  {
    "enum": "{Y, N, NIL, ?}",
    "type": "Enumeration",
    "name": "QSO_COMPLETE"
  },
  {
    "type": "Date",
    "name": "QSO_DATE",
    "enum": ""
  },
  {
    "enum": "",
    "name": "QSO_DATE_OFF",
    "type": "Date"
  },
  {
    "enum": "",
    "name": "QSO_RANDOM",
    "type": "Boolean"
  },
  {
    "enum": "",
    "name": "QTH",
    "type": "String"
  },
  {
    "enum": "",
    "type": "IntlString",
    "name": "QTH_INTL"
  },
  {
    "name": "RIG",
    "type": "MultilineString",
    "enum": ""
  },
  {
    "enum": "",
    "type": "IntlMultilineString",
    "name": "RIG_INTL"
  },
  {
    "enum": "",
    "type": "String",
    "name": "RST_RCVD"
  },
  {
    "enum": "",
    "type": "String",
    "name": "RST_SENT"
  },
  {
    "name": "RX_PWR",
    "type": "Number",
    "enum": ""
  },
  {
    "type": "String",
    "name": "SAT_MODE",
    "enum": ""
  },
  {
    "enum": "",
    "type": "String",
    "name": "SAT_NAME"
  },
  {
    "name": "SFI",
    "type": "Number",
    "enum": ""
  },
  {
    "enum": "",
    "name": "SIG",
    "type": "String"
  },
  {
    "enum": "",
    "name": "SIG_INTL",
    "type": "IntlString"
  },
  {
    "enum": "",
    "name": "SIG_INFO",
    "type": "String"
  },
  {
    "type": "IntlString",
    "name": "SIG_INFO_INTL",
    "enum": ""
  },
  {
    "enum": "",
    "name": "SKCC",
    "type": "String"
  },
  {
    "name": "SOTA_REF",
    "type": "SOTARef",
    "enum": ""
  },
  {
    "enum": "",
    "name": "SRX",
    "type": "Number"
  },
  {
    "enum": "",
    "type": "String",
    "name": "SRX_STRING"
  },
  {
    "enum": "function of Country Code",
    "type": "Enumeration",
    "name": "STATE"
  },
  {
    "enum": "",
    "name": "STATION_CALLSIGN",
    "type": "String"
  },
  {
    "enum": "",
    "type": "Number",
    "name": "STX"
  },
  {
    "enum": "",
    "type": "String",
    "name": "STX_STRING"
  },
  {
    "type": "String",
    "name": "SUBMODE",
    "enum": "Submode, function of MODE"
  },
  {
    "type": "Boolean",
    "name": "SWL",
    "enum": ""
  },
  {
    "name": "TEN_TEN",
    "type": "Number",
    "enum": ""
  },
  {
    "type": "Time",
    "name": "TIME_OFF",
    "enum": ""
  },
  {
    "type": "Time",
    "name": "TIME_ON",
    "enum": ""
  },
  {
    "name": "TX_PWR",
    "type": "Number",
    "enum": ""
  },
  {
    "type": "SecondarySubdivisionList",
    "name": "USACA_COUNTIES",
    "enum": ""
  },
  {
    "enum": "",
    "name": "VE_PROV",
    "type": "String"
  },
  {
    "enum": "",
    "type": "GridSquareList",
    "name": "VUCC_GRIDS"
  },
  {
    "name": "WEB",
    "type": "String",
    "enum": ""
  }
];

ADIF.QSO_FIELDS.typeOf = function (name) {
	name = name.toUpperCase();
	for (var i = 0, it; (it = ADIF.QSO_FIELDS[i]); i++) {
		if (it.name === name) return it.type;
	}
	return null;
};
