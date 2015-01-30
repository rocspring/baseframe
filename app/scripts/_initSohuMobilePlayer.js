/**
 *
 *  正文页视频播放初始化代码，引用视频提供的初始化代码，放于碎片 正文页_前端组_JS 中
 *  页面输出 object SohuMobilePlayerConfig = {} 传入配置参数，如 debug: 1 开启测试
 *  页面 SohuMobilePlayerPool 中存放生成的 player
 *
 *  在以下时机调用：
 *      1. 页面初始加载时
 *      2. 加载更多时
 *
 */
function initSohuMobilePlayer() {
    window.SohuMobilePlayerPool = [];
    window.SohuMobilePlayerPool.ver = 'new';
    var videoNodes = $('.finVideo').find('.player'), id, vids, option, adClose;
    $.each(videoNodes, function(index, node) {
        id = '#' + node.getAttribute('id');
        vids = node.getAttribute('desc');
        if(document.getElementById('adclose') != null){
            adClose = document.getElementById('adclose').getAttribute('desc');
        }

        if (vids) {
            if (vids.indexOf('http://') !== -1) {
                //============= 调用方式修改1 - 开始 ===============
                option = {
                    vids: vids,
                    channeled: '1200110001'
                };
                window.SohuMobilePlayerPool = new SohuMobilePlayer(id, option);
                //============= 调用方式修改1 - 结束 ==============
                window.SohuMobilePlayerPool.ver = 'old';
            } else {
                vids = JSON.parse(vids.replace(/'/g, '"'));
                //============= 调用方式修改2 - 开始 ==============
                option = {
                    vids: vids.join(','),
                    autoplay: false,
                    channeled: '1200110001',
                    adClose: adClose
                };
                var player = new SohuMobilePlayer(id, option);
                //============= 调用方式修改2 - 结束 ==============

                SohuMobilePlayerPool.push(player);
            }
            Statistics.addStatistics({
                '_once_': '000095_video_newsfinal',
                '_trans_': window.CONFIG.videoTrans || ''
            });
            node.removeAttribute('desc');
        }
    });
}


