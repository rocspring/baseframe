/* 
 * 
 * gallery-fin.js
 * 
 */

;(function() {
    
    var $ = window.Zepto || window.jQuery;
    
    var duration = 200;
    if (/Android/i.test(window.navigator.userAgent)) duration = 0;
    
    var GalleryFin = function() {
        this.id = Gallery.getId();
        var newsApiUrl={
            newsPic_n: Gallery.setApi('/api/n/news/%id%/pic/', this.id),
            newsPic_o: Gallery.setApi('/api/o/news/%id%/pic/', this.id),
            newsPicMore: Gallery.setApi('/api/news/%id%/related_pic/', this.id)
        };
        var dataUrl={
            dataMore: newsApiUrl.newsPicMore,
            data: ($('#coop_news').length>0) ?newsApiUrl.newsPic_o : newsApiUrl.newsPic_n
        };
        this.bodyScrollTop = 0;
        this.gallery = new Gallery({
            statHead: '000027',
            urls: dataUrl,
            plugins: [
                new Gallery.Addins.ShowOrigin()
            ],
            defaultShow: false,
            defaultBackToFin: true,
            transitionDuration: duration,
            titleData: $('body .fin h1')[0].innerHTML,
            backCallBack: {
                fuc: this.resetShow,
                self: this
            }
        });

        window.addEventListener('hashchange', $.proxy(this.onHashChange, this), false);

    };
    
    GalleryFin.prototype.onHashChange = function(e) {
        /*
         * 这个函数是处理正文页，打开组图功能之后，使用浏览器后退功能时，关闭组图
         */
        if (window.location.hash === '') {
            this.resetShow(e);
        }
    };
    
    GalleryFin.prototype.resetShow = function(e) { 
        Gallery.statistics('000027_picsback_v3');

        if (window.location.hash == '#p') { window.history.go(-1); return; }
        if (this.gallery.visible) this.gallery.hide();
        e.preventDefault();
    };

    GalleryFin.prototype.showPic = function(e) {
        var d = e.target, silent = true;
        var finPic = $(d).closest('.finPic');
        var img = finPic.find('.img img');
        // 对于加载更多加载出的图片，需要为它们设置data属性
        if (!img.attr('data-pic-order')) {
            $('.finCnt img').each(function(i) {
                $(this).attr('data-pic-order', i + 1);
            });
        }

        if (img.attr('data-pic-order')) {
            var _smuid = window.CookieUtil.get("_smuid");
            var requestJson = {
                v: 3,
                _smuid: _smuid,
                _smuid_type: _smuid ? 2 : 1,
                tt: new Date().getTime()
            };
            Statistics.addStatistics(requestJson, 'http://zz.m.sohu.com/c.gif?');

            Gallery.statistics('000027_pics_largev3');

            /*
             * 正文页打开组图时，给URL增加一个hash锚点，防止点击浏览器后退按键时，正文页退回到新闻列表页
             * 点击浏览器后退按键，是一个非正常退出组图的操作，正确退出组图的方式应当单击左上角的“回退”
             * 当用户点击浏览器后退时，根据hash的特性，页面此时的url是从#p回退到没有锚点的状态，如下：
             * 打开组图时的URL：
             *      http://t2.m.sohu.com/n/367045217/?wscrid=1137_6#p
             * 点击浏览器回退后变为：
             *      http://t2.m.sohu.com/n/367045217/?wscrid=1137_6
             * 此时，页面并未发生跳转，还是在正文页，这次可以利用hashchange事件，检测是否需要关闭组件
             */
            var href = window.location.href;
            window.location.href = (href.indexOf('#') != -1 ? href.substring(0, href.indexOf('#')) : href) + '#p';

            this.gallery.show(+img.attr('data-pic-order'), silent);  // 显示点击的图片
            // 显示图库的时候重载video frame 或 pause video
            if (SohuMobilePlayerPool.ver == 'old') {
                // 旧版，直接调用类的静态函数
                window.SohuMobilePlayer.reload();
            }
            else if (SohuMobilePlayerPool.length > 0) {
                SohuMobilePlayerPool.forEach(function(o, i) {
                    try { 
                        // 新版，调用每个对象的函数
                        o.pause();
                    }
                    catch(e) {}
                });
            }
        }
    };

    window.GalleryFin = GalleryFin;
}());



