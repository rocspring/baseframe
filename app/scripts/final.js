(function (window) {
	var body = document.body,
        $ = window.Zepto,
        $body = $(body),
        $nav = $body.children('.siteNav'),
        $stream = $body.children('.stream'),
        $loadMore = $body.children('.loadMore'),
        CFG = window.CONFIG || {},
        channel = CFG.channel,
        page = CFG.page,
        loading = false, latest = false,
        imageLoader,
        touchStartY,
        Statistics = window.Statistics,
        config_data = window.article_config,
        baseStatisNum = '000118'; 

 //新闻页视频代码
 //不太确定是否有用，先放到这里
if(config_data){
    var newsChannel = config_data.channel_long_path[0][1].match(/\d+/);
    var v_config = {
        newsChannel: newsChannel,
        videoNode: 'video',
        videoCoverNode: '[sid^="player_cover"]',
        videoCoverNode_1: '[sid="player_cover1"]',
        videoCoverNode_2: '[sid="player_cover2"]',
        videoDesNode: '.video .des',
        videoMoreNode: '[mid="more_video"]'
    };

    var n_config = {
        newsId: config_data.news_id,
        showMoreBtn: '.spreadLast',
        setFontBtn: '.setFont',
        layoutNode: '.layout',
        layNode: '.lay',
        originPicNode: '.popOrigPic2',
        originPicNode_img: '.popOrigPic2 img',
        imgNode: '.cnt .pic .img img',
        bigIcon: '.cnt .fuc',
        cnt: '.cnt',
        restCnt: '#rest_content'
    };



    /*新闻正文页代码*/
    var News = function(config) {
        if(!this instanceof News)
            return new News(config);
        this.config = config;
        this.newsId = config.newsId;//传入当前新闻的id
        this.showMoreBtn = $(config.showMoreBtn);
        this.setFontBtn = $(config.setFontBtn);
        this.layoutNode = $(config.layoutNode);
        this.layNode = $(config.layNode);
        this.originPicNode = $(config.originPicNode);
        this.originPicNode_img = $(config.originPicNode_img);
        this.imgNode = $(config.imgNode);
        this.bigIcon = $(config.bigIcon);
        this.cnt = $(config.cnt);
        this.restCnt = $(config.restCnt);
        this.init();
    };
    News.prototype = {
        constructor: News,
        init: function() {
            this.bindUI();
        },
        bindUI: function() {
            var self = this;
            if(self.showMoreBtn.length)
                self.showMoreBtn.get(0).addEventListener('click', function() {
                    self.show_more_content();
            }, false);
        },
        show_more_content: function() {
            var self = this, len = self.imgNode.length;

            self.showMoreBtn.eq(0).html('<img width="16px" height="16px" src="http://s1.rr.itc.cn/p/images/rest_news_loading.gif" />正在加载..');
            self.showMoreBtn.css('font-size','14px');
            var source = document.getElementById('coop_news');
            source = source && source.value ? 'o' : 'n';

            var hide_btn = $('.spreadLast').eq(0) || self.showMoreBtn.eq(0);
            Statistics.addStatistics('000027_remainv3');
            var url='/api/' + source + '/v3/rest/' + self.newsId + '/?_once_=000118_click';
            if(window.location.href.indexOf('partner=ucweb')!=-1){
                url=url+'&partner=ucweb';
            }

            $.ajax({
                url: url,
                dataType: 'json',
                success: function(result){
                    if (result) {
                        self.showMoreBtn.eq(0).html('');
                        hide_btn.hide();
                        var json = result;
                        if(!(json instanceof Object))
                            json = JSON.parse(result);
                        if(json.state == 1){
                            self.restCnt.html(json.rest_content);
                        }
                        self.restCnt.show();
                        // lazyLoader.scan(self.restCnt[0]);
                        window.initSohuMobilePlayer();
                    } else {
                        self.showMoreBtn.eq(0).html('网络中断,请重试');
                        self.showMoreBtn.find('em').hide();
                    }
                },
                error: function(xhr, type){
                    //alert(xhr.status+"||||"+type);
                    self.showMoreBtn.eq(0).html('网络中断,请重试');
                    self.showMoreBtn.find('em').hide();
                }
            });
            
            // 重新刷新广告
            // self.reloadAd();
        },
        reloadAd: function () {
            var ad = $('script[src*="ad.js"]');
            if (ad.length === 0)  {
                return;
            }
            new Image().src = ad[0].src + '?' + Date.now();
            new Function(ad.next('script').text())();
        }
    };

    // Touchable container.
    var Touchable = {};
    var article = $('article.fin');

    App = {
        addFeatures: function() {

                // toggleNav toggleShare toggleSetToolBar
                var navMini = $('nav.mini2');
                var showNav = $('header .showNav a');
                var setFuc = article.find('#setFuc');
                var androidApk = article.find('#androidApk');
                var shareFuc = article.find('#shareFuc');
                var setToolBar = article.find('#setToolBar');
                var shareToolBar = article.find('#shareToolBar');

                //ToggleExpand.toggle(showNav, navMini, "noDis", function() {Statistics.addStatistics('000027_topmore');});
                //ToggleExpand.toggle(setFuc, setToolBar, "noDis");
                
                if ( (/android/i.test(window.navigator.userAgent) || /Adr/i.test(window.navigator.userAgent) ) && androidApk.length > 0) {
                    navMini.after(setToolBar);
                    //console.log(setToolBar);
                    //ToggleExpand.toggle(showNav, setToolBar, "noDis");
                    setFuc.hide();
                    androidApk.show();
                }
                
                //删除图片浏览插入的广告
                if ($('#j_pic_bottom_ad')) {
                    $('#j_pic_bottom_ad').remove();
                }


                //setToolBar
                ({
                    init:function(){
                        setToolBar.find('.changeFont a').on('touchend', this.changeFont);
                        setToolBar.find('.readModel a').on('touchend', App.changeModel);
                    },
                    changeFont:function(){
                        var oFinCnt = article.find('.finCnt');
                        var fontSize = oFinCnt.css('font-size');
                        var num = parseInt(fontSize, 10);

                        if(this.id == 'addFont'){
                            if(num < 18){
                                $(this).removeClass('dis');
                                $('#decreaseFont').removeClass('dis');
                                num = num + 2;
                                if(num == 18){
                                    $(this).addClass('dis');
                                 }
                            }else{
                                $(this).addClass('dis');
                            }
                        }else if(this.id == 'decreaseFont'){
                            if(num > 14){
                                $(this).removeClass('dis');
                                $('#addFont').removeClass('dis');
                                num = num - 2;
                                if(num == 14){
                                    $(this).addClass('dis');
                                }
                            }else{
                                $(this).addClass('dis');
                            }
                        }
                        oFinCnt.css('font-size',num + 'px');
                        Store.set('font_size',num);
                        CookieUtil.set('font_size',num);
                    }
                }).init();

                //original img
                ({
                    init:function(){
                        //if (article.find('.toGallery').length > 0) this.galleryFin = new GalleryFin();
                        this.galleryFin = new GalleryFin();

                        article.find('.finCnt').on('click', $.proxy(this.viewImg , this));
                        //this.parentObj.on('click', $.proxy(this.viewImg , this));
                    },

                    viewImg:function(e)
                    {
                        var d = e.target;
                        var $d = $(d);
                        var src, finPic;

                        if($d.closest('.finPic').length === 0)return;

                        e.preventDefault();
                        this.galleryFin.showPic(e);

                        /*if(d.tagName.toLocaleLowerCase() == 'img' ){  //点击图片
                            //e.preventDefault();
                            src = $d.attr('src');
                            finPic = $d.closest('.finPic');
                            if(*//*d.width == 300 || *//* $d.closest('.finPicView').length === 0 ){
                                finPic.addClass('finPicView');
                                //$d.attr('src',src.replace('/u/','/org/'));
                                $d.attr('src',src.replace('/g/','/org/'));
                            }else{
                                finPic.removeClass('finPicView');
                                //$d.attr('src',src.replace('/org/','/u/'));
                                $d.attr('src',src.replace('/org/','/g/'));
                            }
                        }else if($d.attr('className') == 'fuc_zoom' || $d.parent().attr('className') == 'fuc_zoom'){  // 点击放大镜
                            e.preventDefault();
                            Statistics.addStatistics('000027_pics_maxv3');
                            var img = $d.closest('.finPicImg').find('img');
                            src = img.attr('src');
                            finPic = $d.closest('.finPic');
                            var finPicW = finPic.css('width');
                            console.log(finPicW);
                            if(*//*finPicW == '300px' ||*//* $d.closest('.finPicView').length === 0 ){
                                finPic.addClass('finPicView');
                                //img.attr('src',src.replace('/u/','/org/'));
                                img.attr('src',src.replace('/g/','/org/'));

                            }
                        }else if($d.attr('className') == 'togallery' || $d.parent().attr('className') == 'togallery' || $d.parent().parent().attr('className') == 'togallery'){  // 进图库
                            e.preventDefault();
                            if (this.galleryFin) this.galleryFin.showPic.call(this.galleryFin, e);
                        }*/
                    }
                }).init();

                // Touchable nav
                ({
                    el: $('nav.crumb'),
                    oCrumbBg : $('nav.crumb .crumbBg'),
                    oToMore : $('nav.crumb p.toMore'),


                    init: function() {
                        this.el.on({
                            'touchstart': $.proxy(this.touchhandler,this),
                            'touchmove' : $.proxy(this.touchhandler,this),
                            'touchend'  : $.proxy(this.touchhandler,this)

                        });
                        this.el.find('.toMore > a').on('click', $.proxy(this.fnToMore , this)); //点击箭头
                        this.oCrumbBg.css('left','0');
                        var crumbBgW = parseInt(this.oCrumbBg.css('width'), 10);
                        var screenW = window.innerWidth;
                        var maxLeft =  crumbBgW - (screenW - 69);   // 69是toHome和toMore两块的宽度和
                        this.maxLeft = maxLeft;
                        if( maxLeft > 0){
                            this.el.css('padding','0 30px 0 33px');
                            this.el.find('.crumbBgs').css('margin','0 0 0 6px');
                            this.oToMore.css('display','block');
                            this.oCrumbBg.css('left', "-" + maxLeft + 'px');
                            this.oToMore.find('a').addClass('on');
                        }

                    },
                    //点击箭头，左右滑动到头
                    fnToMore: function(e) {
                        e.preventDefault();
                        var curLeft = parseInt(this.oCrumbBg.css('left'), 10);

                            if(curLeft === 0){
                                this.oCrumbBg.css('left', "-" + this.maxLeft + 'px');
                                this.oToMore.find('a').addClass('on');
                                Statistics.addStatistics('000027_mianbaoxie_end');
                            }else if( curLeft == -this.maxLeft){
                                this.oCrumbBg.css('left',0);
                                this.oToMore.find('a').removeClass('on');
                                Statistics.addStatistics('000027_mianbaoxie_home');
                            }else if( curLeft < 0 && curLeft > -this.maxLeft){
                                if(this.oToMore.find('a').hasClass('on')){
                                    this.oCrumbBg.css('left', "-" + this.maxLeft + 'px');
                                }else{
                                    this.oCrumbBg.css('left',0);
                                }
                             }
                    },
                    touchhandler:function(e){
                        switch (e.type) {
                            case 'touchstart':
                                this.startX = e.touches[0].clientX;
                                break;
                            case 'touchmove':
                                var stopX = e.touches[0].clientX;
                                var offsetX = stopX - this.startX;
                                var curLeft = parseInt(this.oCrumbBg.css('left'), 10);
                                var finLeft = offsetX + curLeft;
                                if( finLeft <= 0 && this.maxLeft>= 0 && finLeft >= -this.maxLeft){
                                    this.oCrumbBg.css('left',finLeft + 'px' );
                                    if (finLeft === 0){
                                        this.oToMore.find('a').removeClass('on');
                                    }
                                    if(finLeft == -this.maxLeft){
                                        this.oToMore.find('a').addClass('on');
                                    }
                                }

                                break;
                            case 'touchend':
                                break;
                        }
                    }

                }).init();


                //fin_weibo
                ({
                    init:function(){
                        this.moreBtn = $('.fin_weibo .cnt .more');
                        this.bindUI();

                    },
                    bindUI:function(){
                        var self = this;
                        self.moreBtn.one('click',function(e){
                            e.preventDefault();
                            $(this).closest('p').addClass('showMore_p');
                        });
                    }
                }).init();

            }
    };

     //发送返回首页的统计码
    var sendBackHomeStatis = function  () {
        // 监听回退按钮事件，如果上一个页面是首页的话，那么直接使用histroy.back()返回，节省网络资源,也可以回到历史位置
        var backHomeHandler = function (e){
            e.preventDefault();
            var a = document.createElement('a');
            a.href = document.referrer;
            var pathname = a.pathname, hostname = a.hostname;

            var now = new Date().getTime(),
                time = window.localStorage.getItem('msohu/recommend_final/back_timer') || now,
                tempTimer,
                prevHostName;

            if (time > now - (5 * 60 * 1000) && /^(([ab]|[td][1-9])\.)?m\.sohu\.com$/i.test(hostname) && (pathname === '/recommend/index')) {
                Statistics.addStatistics(baseStatisNum + '_backstream');
                tempTimer = setTimeout(function () {
                    tempTimer = null;
                   window.history.back();
                }, 100);
            } else {
                prevHostName = window.location.hostname;
                //兼容测试环境
                //最后的once码
                var trueOnceCode = baseStatisNum + '_backstream';
                if (/m\.sohu\.com$/.test(prevHostName)) {
                    window.location.href = 'http://' + prevHostName +'/recommend/index?_once_='+ trueOnceCode ;
                }else{
                    window.location.href = 'http://m.sohu.com/recommend/index?_once_='+ trueOnceCode ;
                }
                
            }
            window.localStorage.setItem('msohu/recommend_final/back_timer', now);
            a = null;
        };

        $('.h_min .logo_min a').on( 'click', backHomeHandler);
        $('.back-to-home .back-2-home a').on( 'click', backHomeHandler);

    };

        $(function(){
        //实例化新闻对象
        var news = new News(n_config);

        //正文页图片大图浏览
        App.addFeatures();
        
        //发送返回首页的统计码
        sendBackHomeStatis();

        //正文页内嵌视频初始化
        window.initSohuMobilePlayer();

    });
}

//微信分享
function share_to_qq (){
    //模拟统计点击，然后提交表单
    $.ajax({
        'url':'/sr/?redirect_url=http://ti.3g.qq.com/open/s?aid=share&_once_=000022_tengxun_sharetov3',
        'success': function(result) {
            share2qq.submit();
        },
        'error':function(){
            share2qq.submit();
        }
    });
}

window.share_to_qq = share_to_qq;

})(window);