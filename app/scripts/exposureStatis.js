/*
*exposure Statistics :曝光的统计
*@author: wshp
*@E-mail:wshp000000@gmail.com
*依赖发送统计的组件，statistics.js
*version: 0.4.0
**/

(function () {
	var document = window.document,
		Statistics = window.Statistics,
		innerHeight = window.innerHeight,
		innerWidth = window.innerWidth,
		body = document.body,
		baseUrl = ''; //默认的发送统计链接

	/*
	* @param {Object} rootDom : 某块需要统计曝光的DOM元素，默认为body
	* @param {String} exposureCode : 曝光码
	* @param {Function} isStatisElement : 判断一个元素是否是曝光统计元素,参数是一个dom对象，默认为a标签，返回一个对象,有两个属性:{ isNeedStatis: true, param: {} }。
	**/

	function ExposureStatis ( rootDom, exposureCode, isStatisElement ) {

		this.rootDom = rootDom || body;
		this.exposureCode = exposureCode || '';
        this.isStatisElement = isStatisElement || null;
		//所有要统计的曝光元素数组
		/********
		*每个值的格式
		*	{
		*		dom: domObj, //dom对象
				param : {}   //参数对象
		*	}
		***************/
		this.domArr = [];
		//setTimeout对象
		this.statisticsTimer = null;

		this.init( this.rootDom );
	}

	ExposureStatis.prototype = {

		//统计的间隔时间
		intervalTime : 100,

		init : function ( rootDom ){

			this.addElements( rootDom );
			this.sendFirstScreenStatis();
			this.addExposureListen( );
		},

		//添加所有的曝光统计元素
		addElements : function ( rootDom ) {
			var aTagArr = rootDom.getElementsByTagName('a'),
				len = aTagArr.length,
				i;

			if (len === 0) return;
			
			for ( i = 0; i < len; i++ ) {
				this.addElement(aTagArr[i]);
			}
		},

		//添加新的曝光统计元素(传入的参数是dom数组)
		addNewElements : function ( newDomArr ) {
			if ( toString.call(newDomArr) !== '[object Array]' || newDomArr.length === 0) return;

			if( this.domArr.length === 0){
				this.removeExposureListen();
				this.addExposureListen( );
			}
			
			var len = newDomArr.length,
				i;
			for ( i = 0; i < len; i++ ) {
				this.addElement(newDomArr[i]);
			}
		},

		//未滚动的情况下，直接发送首屏已曝光的元素
		sendFirstScreenStatis : function () {
			var that = this;
			//判断所有的元素是否曝光
			this.allIsExposure(that.domArr);
		},

		//添加曝光监听
		addExposureListen : function () {
			var that = this;

			window.addEventListener( 'scroll', proxy( that.exposureListenFunc, that), false );
		},

		//移除曝光监听
		removeExposureListen : function () {
			var that = this;

			window.removeEventListener( 'scroll', proxy( that.exposureListenFunc, that), false);
		},

		//曝光监听函数
		exposureListenFunc : function () {
			var that = this;
			// that.allIsExposure(that.domArr);

			clearInterval(that.statisticsTimer);
			that.statisticsTimer = setTimeout(function () {
					that.allIsExposure(that.domArr);
				}, that.intervalTime);

		},

		//对所有的监听元素，判断是否曝光
		allIsExposure : function ( arr ) {
			var i,
				len = arr.length,
				domArr = this.domArr,
				indexArr = [];

			//没有监听元素时
			if (len === 0) {
				this.removeExposureListen();
				return;
			}

			for ( i = 0; i < len; i++) {
				var isEXpos = this.isExposure(domArr[i].dom);

				if(isEXpos){
					Statistics.addStatistics(domArr[i].param);
					indexArr.push(i);
				}
			}

			this.removeElement(indexArr);
		},

		//增加一个监听元素
		addElement : function ( domObj ) {
			var that = this,
                isStatisElementObj = that.isStatisElement(domObj);

            if(isStatisElementObj.isNeedStatis){
                var tempObj = {};

                tempObj.dom = domObj;
                tempObj.param = {
                    _once_: that.exposureCode,
                    rdm : Math.random().toString().substring(2,15)
                };

               tempObj.param = extend( tempObj.param, isStatisElementObj.param );

                that.domArr.push(tempObj);
            }

		},

		//删除指定的监听元素
		removeElement : function ( indexArr ) {
			this.domArr = remove(this.domArr, indexArr );
		},

		//判断dom元素是否曝光
		//返回Boolean值
		isExposure : function ( domObj ) {
			var overScreenHeight, //网页超出屏幕的高度
			distanceTopHeight;//元素距离屏幕顶部的高度
			if( domObj ) {
				overScreenHeight = getScrollY();
				distanceTopHeight = domObj.offsetTop;
				
				return ( distanceTopHeight > overScreenHeight && distanceTopHeight - overScreenHeight < innerHeight -10) ? true : false;
			}

			return false;
		}

	};

	window.ExposureStatis = ExposureStatis;

	//给数组添加一个删除元素方法
	function remove (arr, index) {
		if( typeof arr === 'object' && toString.call(arr) === '[object Array]'){
			if ( typeof index === 'number' &&  index >= 0 ) {
				return arr.remove ? arr.remove(index) : arr.slice(0, index).concat(arr.slice( index + 1, arr.length));
			} else if ( typeof index === 'object' && toString.call(index) === '[object Array]' ) {
				//传入一个下标数组，删除这些元素
				var newArr = [];
				for ( var i = 0, len = index.length; i < len; i++ ){
					arr[index[i]] = void 0;
				}

				for( var j = 0, arrLen = arr.length; j < arrLen; j++ ){
					if ( arr[j] !== void 0 ) {
						newArr.push(arr[j]);
					}
				}

				return newArr;
			}
			
		}
	}

	// 获取网页超出屏幕的高度
	function getScrollY() {
		return window.pageYOffset || window.scrollY || document.documentElement.scrollTop;
	}

	// 指定函数的运行作用域
	function  proxy ( fun, context ) {
		var source = context || this;

		return fun.bind ?  fun.bind(source) : function () {
			fun.apply(source, arguments);
		};
	}

    // 扩展对象的属性
    function extend ( c, p ){
        var isObject = function ( p ){
            return Object.prototype.toString.call(p) === '[object Object]';
        };

        if( !isObject(c) || !isObject(p) ) return;

        for ( var i in p ){
            if(p.hasOwnProperty(i)){
                c[i] = p[i];
            }
        }

        return c;
    }
})(window);