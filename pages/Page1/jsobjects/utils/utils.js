export default {
	mappedCountries: () => {
		var countries = get_country_orders.data;
		
		countries = countries.map(({ c_revenue, country}) => ({ "id": utils.mapCountry(country), "value": c_revenue }));
		
		return countries;
	},
	mapCountry: ( code = "" ) => {
		var ret = "001";
		
		switch (code) {
			case 'CA':
				ret = '005'
				break;
			case 'MX':
				ret = '016'
				break;
			case 'GL':
				ret = '024'
				break;
			case 'US':
				ret = "023";
				break;
			default:
				ret = '001';
		}
		
		return ret;
		
	},
	timeframe: ( type = "date_created", date_convert = false ) => {
		// generates time restriction for queries, using the time restriction set by users
		// inputs: date = column name for the date column to be used in the comparison
		// returns ['current', 'previous']
		
		var time = appsmith.store.button, ret = [], dateCurrent = new Date(), dateMiddle = new Date(), datePast = new Date(), compare = "", offset = 0;
		
		/********
		//placeholders
		ret.push(" 1 ");
		ret.push(" 1 ");
		// */
		
		dateMiddle.setUTCHours(0, 0, 0, 0);
		datePast.setUTCHours(0, 0, 0, 0);
		
		//default time = mtd
		time = ( time == null ) ? "mtd" : time;
		
		//debug
		//time = "ly";
		
		// if time is one of the "incomplete" types
		compare = ["today", "wtd", "mtd", "ytd"];
		
		if ( compare.includes( time ) ) {
			//current date (most recent records) is today (tomorrow just to load all items no exceptions)
			dateCurrent.setDate( dateCurrent.getDate() + 1 );
		} else {
			// current date is the begining of the period (start of the day (yesterday), week, month, year)
			dateCurrent.setUTCHours(0, 0, 0, 0);
			//dateCurrent.setDate( 1 );
			
			//increase by one all further calculations
			offset = 1;
			
			//set day, week, month, year
			switch (time) {
				case 'lw':
					dateCurrent.setDate( dateCurrent.getDate() - dateCurrent.getDay() - 1 );
					break;
				case 'lm':
					dateCurrent.setDate( 0 );
					break;
				case 'ly':
					dateCurrent.setMonth( 0 );
					dateCurrent.setDate( 0 );
					break;
			}
		}
		
		if ( time == "today" || time == "yesterday" ) {
			dateMiddle.setDate( dateMiddle.getDate() - offset );
			datePast.setDate( datePast.getDate() - 1 - offset );
		}
		
		if ( time == "wtd" || time == "lw" ) {
			dateMiddle.setDate( dateMiddle.getDate() - ( offset ) * 7 - dateMiddle.getDay() - 1 );
			datePast.setDate( datePast.getDate() - ( 1 + offset ) * 7 - datePast.getDay() - 1  );
		}
		
		if ( time == "mtd" || time == "lm" ) {
			dateMiddle.setDate( 0 );
			dateMiddle.setMonth( dateMiddle.getMonth() - offset );
			
			datePast.setMonth( datePast.getMonth() - 1 - offset );
			datePast.setDate( 0 );
		}
		
		if ( time == "ytd" || time == "ly" ) {
			dateMiddle.setYear( dateMiddle.getFullYear() - offset );
			dateMiddle.setMonth( 0 );
			dateMiddle.setDate( 0 );
			
			datePast.setYear( datePast.getFullYear() - 1 - offset );
			datePast.setMonth( 0 );
			datePast.setDate( 0 );
		}
		
		
		type = ' `' + type + '` ';
		
		dateCurrent = ' "' + dateCurrent.toISOString().replace('T', ' ') + '" ';
		dateMiddle = ' "' + dateMiddle.toISOString().replace('T', ' ') + '" ';
		datePast = ' "' + datePast.toISOString().replace('T', ' ') + '" ';
		
		if ( date_convert == true ) {
			dateCurrent = " DATE(" + dateCurrent + ") ";
			dateMiddle = " DATE(" + dateMiddle + ") ";
			datePast = " DATE(" + datePast + ") ";
		}
		
		ret.push( type + ' < ' + dateCurrent + ' AND  ' + type + ' >= ' + dateMiddle   );
		ret.push( type + ' < ' + dateMiddle + ' AND  ' + type + ' >= ' + datePast   );
		
		return ret;
	},
	onLoad: async () => {
		
		if ( appsmith.store.button == null ) {
			storeValue('button', 'mtd');
		}
		
		return appsmith.store.button;
	},
	setButton: ( slug ) => {
		// possible values
		// today, (X to date) wtd, mtd, ytd, yesterday, (last X) lw, lm, ly
		storeValue( 'button', slug );
		
		get_country_orders.run();
		get_customers_ranking.run();
		get_kpis.run();
		get_linechart.run();
		get_linechart_past.run();
		get_orders_by_status.run();
		get_product_ranking.run();
	},
	currentButton: ( slug = "" ) => {
		//#2E3D49 dark
		//"#03B365" gray
		
		var ret = false;
		
		if ( slug == appsmith.store.button ) {
			ret = true;
		}
		
		return ret;
	},
	currencyFormat: (n) => {
		n = ( n || 0 );
		
		return Intl.NumberFormat('en-US' , {
				style: "currency",
				currency: "USD",
				
		}).format(n);
	},
	queryBuild: () => {
		// builds queries for the line chart
		// return [current, past]
		// utils.timeframe( type = "date_created", date_convert = false  );
		var time = appsmith.store.button, ret = [], labels_table = "", labels_time_format = "", orders_time_format = "", labels_where = [ " 1 ", " 1 "], orders_where = utils.timeframe( ), query = "";
		
		//default time = mtd
		time = ( time == null ) ? "mtd" : time;
		
		// select if we are plotting data from calendar_table (dates, weeks, months) or time_table (hours)
		if ( time == "today" || time == "yesterday" ) {
			labels_table = "time_table";
			
		} else {
			labels_table = "calendar_table";
			labels_where = utils.timeframe( "dt", true  );
		}
		labels_table = ' `' + labels_table + '` ';
		
		// select the column that is the time_format for the labels and orders
		switch (time) {
				case 'today':
				case 'yesterday':
					labels_time_format = ' value as "time_format", `24h` as "label" ';
					orders_time_format = ' HOUR(date_created) as "time_format" ';
					break;
				
				case 'wtd':
				case 'lw':
					labels_time_format = ' `dt` as "time_format", `dayName` as "label"  ';
					orders_time_format = ' DATE(date_created) as "time_format"  ';			
					break;
				
				case 'mtd':
				case 'lm':	
					labels_time_format = ' `dt` as "time_format", CONCAT(`d`, " ") as "label"  ';
					orders_time_format = ' DATE(date_created) as "time_format"  ';		
					break;
				
				case 'ytd':
				case 'ly':
					labels_time_format = ' `m` as "time_format", `monthName` as "label"  ';
					orders_time_format = ' MONTH(date_created) as "time_format"  ';				
					break;
		}
		
		//build main query
		query += " SELECT `tm`.`label`, `orders`.`value` FROM ";
		// calendar select
		query += "(";
			query += ' SELECT *, ' + labels_time_format + ' FROM ' + labels_table + ' WHERE ' + labels_where[0] + ' GROUP BY `time_format`  ';
		query += ") as tm ";
		// orders select
		query += " LEFT JOIN (";
			query += 'SELECT *, ' + orders_time_format + ' , SUM(total_sales) as "value" FROM `wp_wc_order_stats` WHERE ' + orders_where[0] + ' GROUP BY `time_format`';
		query += ") as orders ";
		// end query
		query += " ON `tm`.`time_format` = `orders`.`time_format` ";
		
		ret.push(query);
		//build past query
		query = "";
		query += " SELECT `tm`.`label`, `orders`.`value` FROM ";
		// calendar select
		query += "(";
			query += ' SELECT *, ' + labels_time_format + ' FROM ' + labels_table + ' WHERE ' + labels_where[1] + ' GROUP BY `time_format`  ';
		query += ") as tm ";
		// orders select
		query += " LEFT JOIN (";
			query += 'SELECT *, ' + orders_time_format + ' , SUM(total_sales) as "value" FROM `wp_wc_order_stats` WHERE ' + orders_where[1] + ' GROUP BY `time_format`';
		query += ") as orders ";
		// end query
		query += " ON `tm`.`time_format` = `orders`.`time_format` ";
		
		ret.push(query);
		
		return ret;
	}
}