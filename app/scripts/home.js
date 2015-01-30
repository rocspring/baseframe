(function(window) {
    var body = document.body,
        Zepto = window.Zepto,
        $body = Zepto(body),
        $nav = $body.children('.siteNav'),
        $stream = $body.children('.stream'),
        $loadMore = $body.children('.loadMore'),
        CFG = window.CONFIG || {},
        template = window.template,
        page = CFG.page,
        loading = false,
        latest = false,
        imageLoader,
        touchStartY,
        Statistics = window.Statistics,
        ExposureStatis = window.ExposureStatis,
        NativeAjax = window.NativeAjax,
        baseStatisNum = '000118',
        adStatisNum = '000000',
        onceCode = window.CONFIG.once || '000118_click',
        isFinalPage = !!window.article_config;

    var requestNum = 1;

    template.helper('handleScoreData', function(param) {
        return param ? '&_p=' + param : '';
    });

    /*
    <%if ( data[i]["type"] == "ad" ) {%>
        <%=data[i]["url"]%>
    <%}else if ( data[i]["type"] == "p" ) {%>
        /p/<%= data[i]["id"] %>/?v=3&seq=<%= data[i]["seq"] %><%=handleScoreData(data[i].score)%>
    <%}else if ( data[i]["type"] == "fr" ) {%>
        /fr/<%= data[i]["id"] %>/?v=3&seq=<%= data[i]["seq"] %><%=handleScoreData(data[i].score)%>
    <%}else{%>
        /n/<%= data[i]["id"] %>/?v=3&seq=<%= data[i]["seq"] %><%=handleScoreData(data[i].score)%>
    <%}%>
    */
    var streamRender = template.compile('\
        <% for (var i = 0; i < data.length; i++) { %>\
            <a \
                href="<%if ( data[i]["type"] == "ad" ) {%><%=data[i]["url"]%><%}else if ( data[i]["type"] == "p" ) {%>/p/<%= data[i]["id"] %>/?v=3&seq=<%= data[i]["seq"] %><%=handleScoreData(data[i].score)%><%}else if ( data[i]["type"] == "fr" ) {%>/fr/<%= data[i]["id"] %>/?v=3&seq=<%= data[i]["seq"] %><%=handleScoreData(data[i].score)%><%}else{%>/n/<%= data[i]["id"] %>/?v=3&seq=<%= data[i]["seq"] %><%=handleScoreData(data[i].score)%><%}%>"\
                class="feed <% if (data[i]["type"] == "n" || data[i]["type"] == "fe" || data[i]["type"] == "fr" || ( data[i]["type"] == "ad" && data[i]["review"] !== "" ) ) { %><% if (!data[i]["image"]) { %>feed_simple<% } else { %>feed_full<% } %><% } else if (data[i]["type"] == "p" || ( data[i]["type"] == "ad" && data[i]["review"] === "" ) ) { %>feed_gallery<% } %>"\
                data-type = "<%if ( data[i]["type"] == "ad" ) {%>ad<%}else{%>news<%}%>"\
                index = "<%=i%>">\
            <div class="title"><%= data[i]["sub_title"] %></div>\
                <div class="cnt">\
                    <% if (data[i]["image"]) { %>\
                    <div class="picContainer">\
                    <div class="pic">\
                        <div class="img">\
                            <img src="<%= data[i]["image"]["url"] %>" alt="<%= data[i]["image"]["alt"] %>" ">\
                            <% if (data[i]["type"] == "p") { %><i class="i iFeedGallery"><%= data[i]["image_count"] %></i><% } %>\
                        </div>\
                    </div>\
                    </div>\
                    <% } %>\
                    <div class="des">\
                        <div class="brief"><% if (data[i].review) { %>\
                        <div class="text"><%= data[i].review %></div>\
                        <% } %></div>\
                        <div class="info">\
                            <div class="opt toSource"><%= data[i]["media"] %></div>\
                            <%if ( data[i]["type"] !== "ad") {%>\
                                <div class="opt toCmts"><i class="i i1"></i><%= data[i]["comment_count"] %></div>\
                            <%}%>\
                        </div>\
                    </div>\
                </div>\
            </a>\
        <% } %>\
    ');

    // 曝光码发送对象
    var exposureStatis;

    init();

    function init() {
        focusMap();
        bindEvents();

        // feed流中每条新闻的曝光统计
        // 区分正文页和首页流的曝光码
        exposureStatis = isFinalPage ? (new ExposureStatis(null, baseStatisNum + '_finexposure', isStatisElement)) : (new ExposureStatis(null, baseStatisNum + '_exposure', isStatisElement));

    }

    function bindEvents() {
        Zepto(window).scroll(onScroll);

        // 发送广告的点击统计
        $stream.on('click', 'a', function(e) {
            if ($(this).attr('data-type') === 'ad') {
                e.preventDefault();

                var tempStr = isFinalPage ? '_finadclick' : '_adclick',
                    tempUrl = $(this).attr('href'),
                    index = this.getAttribute('index'),
                    adType;

                if ($(this).hasClass('feed_simple"')) {
                    adType = 'info_bannertxt';
                } else if ($(this).hasClass('feed_full')) {
                    adType = 'info_pictxt';
                } else if ($(this).hasClass('feed_gallery')) {
                    adType = 'info_bigpictxt';
                }

                Statistics.addStatistics({
                    _once_: baseStatisNum + tempStr,
                    index: index,
                    freq: requestNum,
                    type: adType
                });

                // 延迟200ms跳转
                var timer = setTimeout(function() {
                    timer = null;
                    window.location.href = tempUrl;
                }, 200);
            }
        });
    }

    /**********************功能函数***************************/
    function focusMap() {
        // 头条幻灯片
        
    if (document.querySelector('.topic-info')) {

        var imgs = Array.prototype.slice.call(document.querySelectorAll('.topic-item img'));
        if (imgs.length > 1) {
             homeSlide = new Slide({
                targetSelector: '.topic-info',
                prevSelector: '.topic-info .page-prev',
                nextSelector: '.topic-info .page-next',
                onSlide: function(index) {
                    if (index === 0) {
                        this.prevEl.children[0].style.opacity = '.5';
                        this.nextEl.children[0].style.opacity = '';
                    } else if (index == this.getLastIndex()) {
                        this.prevEl.children[0].style.opacity = '';
                        this.nextEl.children[0].style.opacity = '.5';
                    } else {
                        this.prevEl.children[0].style.opacity = '';
                        this.nextEl.children[0].style.opacity = '';
                    }
                    
                    window.onresize = function(){
                        document.querySelector("#topic-swipe").style.transform="translate3d(-"+(document.body.clientWidth*index)+"px, 0px, 0px)";
                        for(var i=0;i<document.querySelectorAll(".topic-item").length;i++){
                            document.querySelectorAll(".topic-item")[i].style.left=document.documentElement.clientWidth*i+"px";
                        }
                    };
                }
            });
                //因为使用碎片，碎片使用了延迟加载，只能js变换img的真实src
                /*Zepto(imgs).each(function () {
                    if(Zepto(this).attr('original')){
                         Zepto(this).attr('src', Zepto(this).attr('original'));
                    }
                });*/
            } else {
                document.querySelector('.topic-info .page-wrapper').style.display = 'none';
            }

        }
    }


    function loadNext() {
        if (!loading && !latest) {
            loading = true;

            var streamArr = $('.stream').find('a'),
                lastUrl = streamArr.length === 0 ? '' : streamArr[streamArr.length - 1].getAttribute('href'),
                seq,
                regResult;
            if (regResult = /&seq=(\d+)/.exec(lastUrl)) {
                seq = parseInt(regResult[1], 10) + 1;
            } else {
                seq = 1;
            }

            //t2.m.sohu.com/recommend/api/msg?seq=1
            new NativeAjax({
                type: 'get',
                url: '/recommend/api/msg?seq=' + seq, // TODO 临时修改seq,为了测试
                dataType: 'json',
                success: function(response) {
                    Statistics.addStatistics(baseStatisNum + '_load');

                    if (response.data.length > 0) {
                        $newsobj = $(streamRender(response));
                        requestNum++;
                        // 兼容打底数据，至少添加_once_码
                        $newsobj.each(function(i) {
                            if (this.nodeType === 1) {
                                // 需要_once_,impress_id,others等参数
                                $(this).attr('href', $(this).attr('href') + (isFinalPage ? '&_once_=' + baseStatisNum + '_finclick' : '&_once_=' + baseStatisNum + '_click'));
                            }
                        });
                        if (!!response.bucket_id) {
                            $newsobj.each(function(i) {
                                if (this.nodeType === 1) {
                                    // 需要_once_,impress_id,others等参数
                                    $(this).attr('href', $(this).attr('href') + '&bucketId=' + response.bucket_id + (response.impression_id ? '&_imp=' + response.impression_id : '') + (response.others ? '&_o=' + response.others : ''));
                                }
                            });
                        }
                        $stream.append($newsobj);
                    }
                    page = response.page;

                    // 添加新的曝光统计元素
                    var reg = /<\/a\>/g,
                        newsDomsStr = streamRender(response),
                        len = newsDomsStr.match(reg) ? newsDomsStr.match(reg).length : 0,
                        aTagArr = $stream.find('a');
                    if (len > 0) {
                        $newsobj = aTagArr.slice(-len, -1);
                        $newsobj.push(aTagArr.slice(-1)[0]);
                        exposureStatis.addNewElements($newsobj);
                    }

                    if (response.data.length < 0) {
                        latest = true;
                        $loadMore.hide();
                    }

                    loading = false;
                }
            });

            //zepto的返回的数据，中文是乱码，未找到原因，用原生的Ajax处理。
            /* Zepto.ajax({
                 //http://域名/api/dc/msg?seq=#SEQ#&length=20
                 url: '/api/dc/msg',
                 type: 'GET',
                 dataType: 'json',
                 data: {
                         'seq': seq
                     },
                 success: function(response){
                     Statistics.addStatistics(baseStatisNum + '_load');
                     
                     if(response.data.length > 0){
                         $newsobj = $(streamRender(response));
                         $stream.append($newsobj);
                     }
                     page = response.page;

                     //添加新的曝光统计元素
                     var reg = /<\/a\>/g,
                         newsDomsStr = streamRender(response),
                         len = newsDomsStr.match(reg) ? newsDomsStr.match(reg).length : 0;
                     if(len > 0) {
                         $newsobj = $stream.find('a').slice(-len, -1);
                         exposureStatis.addNewElements($newsobj);
                     }
                     
                     if (response.data.length < 5) {
                         latest = true;
                         $loadMore.hide();
                     }
                 },
                 complete: function(xhr, type){
                     loading = false;
                 }
             });*/
        }

    }


    function autoPush() {
        var $dom = Zepto([
            '<div class="tip pushTip init">',
            '<div class="wrap">',
            '<div class="status status1">推荐了4条您感兴趣的新资讯，点击查看</div>',
            '<div class="status status2">加载中......</div>',
            '<div class="status status3">网络不给力</div>',
            '</div>',
            '</div>'
        ].join(''));
        $dom.on('click', function(e) {
            if ($dom.hasClass('fail')) return;
            $dom.removeClass('init').addClass('loading');
            Statistics.addStatistics('000090_feed');

            Zepto.ajax({
                url: '/api/feed/recommend/' + channel + '/',
                type: 'GET',
                dataType: 'json',
                success: function(response) {
                    $dom.addClass('init');
                    $stream.prepend(streamRender(response));
                    // imageLoader.scan($stream[0]);
                    if (window.pageYOffset > 0) window.scrollTo(0, 1);
                },
                error: function(xhr, type) {
                    $dom.addClass('fail');
                    setTimeout(function() {
                        $dom.removeClass('fail').addClass('init');
                    }, 3 * 1000);
                },
                complete: function(xhr, type) {
                    $dom.removeClass('loading');
                }
            });

        });
        $dom.appendTo($nav);
    }

    function onScroll() {
        var y = window.pageYOffset;
        // fixedNav(y);
        if (y + window.innerHeight + 50 > body.scrollHeight) {
            loadNext();
            /*if (!window.article_config) {   
            }*/
        }
    }


    // 判断元素是否是需要统计的元素,返回需要统计的参数
    function isStatisElement(domObj) {

        var result = {
                isNeedStatis: false,
                param: {}
            },
            tempStr = isFinalPage ? '_finadexposure' : '_adexposure',
            dataType = domObj.getAttribute('data-type'),
            index = domObj.getAttribute('index'),
            adType;

        if (!domObj || domObj.tagName.toLowerCase() !== 'a') return result;

        if ($(domObj).hasClass('feed_simple"')) {
            adType = 'info_bannertxt';
        } else if ($(domObj).hasClass('feed_full')) {
            adType = 'info_pictxt';
        } else if ($(domObj).hasClass('feed_gallery')) {
            adType = 'info_bigpictxt';
        }

        var domUrl = domObj.getAttribute('href'),
            newsRegResult = /\/([np])\/(\d+)/.exec(domUrl),
            paramsObj = formatUrlParam(domUrl);

        if (newsRegResult) {
            // 新闻元素
            result.isNeedStatis = true;
            if (domUrl.indexOf('_imp') === -1) {
                result.param = {
                    type: newsRegResult[1],
                    id: newsRegResult[2]
                };
            } else {
                result.param = {
                    type: newsRegResult[1],
                    id: newsRegResult[2],
                    _imp: paramsObj['_imp'] || '',
                    _p: paramsObj['_p'] || '',
                    _o: paramsObj['_o'] || ''
                };
            }

        } else if (dataType === 'ad') {
            // 广告元素
            result.isNeedStatis = true;
            result.param = {
                _once_: baseStatisNum + tempStr,
                index: index,
                freq: requestNum,
                type: adType
            };
        }

        return result;
    }

    //把url的参数变为对象
    function formatUrlParam(url) {
        if (typeof url !== 'string' || url.indexOf('?') === -1) return {};

        var paramsStr = url.split('?')[1],
            paramsArr = paramsStr.split('&'),
            i = 0,
            len = paramsArr.length,
            result = {},
            oneParamArr;

        for (; i < len; i++) {
            oneParamArr = paramsArr[i].split('=');
            result[oneParamArr[0]] = oneParamArr[1];
        }

        return result;
    }

})(window);