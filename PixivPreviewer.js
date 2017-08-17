// ==UserScript==
// @name         PixivPreviewer
// @namespace
// @version      1.19
// @description  在搜索页显示较大的预览图（请注意阅读详细信息）。Show preview of pictures in serach page.
// @author       Ocrosoft
// @match        https://www.pixiv.net/search.php*
// @match        https://www.pixiv.net/member_illust.php?mode=medium*
// @match        https://www.pixiv.net/member_illust.php?mode=ugoira_view*
// @match        https://www.pixiv.net/ranking.php*
// @grant        none
// @require      http://code.jquery.com/jquery-2.1.4.min.js
// @namespace
// @namespace 
// ==/UserScript==

function log(text) {
    console.log(text);
}
/**
 * ---------------------------------------- 以下为 全局 部分 ----------------------------------------
 */
/**
* 节点结构
* -div, [picList]
* --div
* ---figure
* ----div, [picDiv]
* -----a, [picHref]
* ------img(图片节点), [picNode]
* -----div(菜单)
*/
var dataDiv, picList, picDiv = [], picHref = [], picNode = []; // 相关元素，含义见上
var dataStr; // 更新后图片信息使用 json 保存在了 dataDiv 的 data-items 属性中
var imgData; // 保存解析后的 json
var mousePos; // 鼠标位置
// 获取相关的元素
function getImageElements() {
    $('.popular-introduction').remove();
    dataDiv = $('#js-mount-point-search-result-list');
    dataStr = dataDiv.attr('data-items');
    imgData = eval(dataStr);
    picList = dataDiv.children()[0];
    var pics = $(picList).children();
    picDiv = [], picHref = [], picNode = [];
    for (var i = 0; i < pics.length; i++) {
        picDiv.push(pics[i].childNodes[0].childNodes[0]);
        $(picDiv[i]).attr('data-index', i);
        picHref.push(picDiv[i].childNodes[0]);
        $(picHref[i]).attr('data-index', i);
        picNode.push($(picHref[i]).children('img')[0]);
        $(picNode[i]).attr('data-index', i);
        $(picNode[i]).attr('data-id', imgData[i].illustId);
    }
}
// 动图预览在相关页面调用的函数(自动执行，非动图页面无操作)[属于预览功能]
(function animePreview() {
    // 普通查看转换为全屏查看
    if (location.href.indexOf('medium') != -1 && location.href.indexOf('animePreview') != -1) {
        location.href = location.href.replace('medium', 'ugoira_view');
        return;
    }
    // 全图预览调节并返回 canvas 大小
    if (location.href.indexOf('ugoira_view') != -1 && location.href.indexOf('animePreview') != -1) {
        var height = parseInt($('canvas').css('height').split('px'));
        var width = parseInt($('canvas').css('width').split('px'));
        var newHeight = 580 / width * height;
        $('canvas').css({ 'height': newHeight + 'px', 'width': 580 + 'px' });
        window.parent.iframeLoaded(newHeight, 580);
        return;
    }
})();
// iframe 加载完成时调用（动图预览）[属于预览功能]
// arg: canvas 元素高，canvas 元素宽
function iframeLoaded(height, width) {
    $('.pixivPreview').children('iframe').css({ 'width': width + 20 + 'px', 'height': height + 20 + 'px' });
    // 调整位置
    var divX = mousePos.x, divY = mousePos.y;
    var screenWidth = document.documentElement.clientWidth;
    var screenHeight = document.documentElement.clientHeight;
    if (mousePos.x > screenWidth / 2) {
        divX -= width;
    }
    if ((mousePos.y - document.body.scrollTop) >
        screenHeight / 2) {
        divY -= height;
    }
    $('.pixivPreview').css({ 'left': divX + 'px', 'top': divY + 'px' });
    $('.pixivPreview').children('iframe').css('display', '');
    $('.pixivPreview').children('img').remove();
}
/**
 * ---------------------------------------- 以下为 预览功能 部分 ----------------------------------------
 */
function pixivPreviewer() {
    // 开启预览功能
    function activePreview() {
        // 鼠标移动到图片上显示预览图
        $(picHref).mouseover(function (e) {
            // 按住 Ctrl键 不显示预览图
            if (e.ctrlKey) {
                return;
            }
            // 从预览图移动到图片上，不应再次显示
            try {
                if ($(e.relatedTarget.parentNode).hasClass('pixivPreview')) {
                    return;
                }
            } catch (e) { }
            // 图片索引
            var dataIndex = $(this).attr('data-index');
            // 图片节点
            var imgNode = picNode[dataIndex];
            // 鼠标位置
            mousePos = { x: e.pageX, y: e.pageY };
            // 预览 Div
            var previewDiv = document.createElement('div');
            $(previewDiv).css({ 'position': 'absolute', 'z-index': '999999' });
            $(previewDiv).addClass('pixivPreview');
            $(previewDiv).attr('data-index', dataIndex);
            // 添加 Div 到 body
            $('.pixivPreview').remove();
            $('body')[0].appendChild(previewDiv);
            // 加载中图片节点
            var loadingImg = new Image();
            loadingImg.src = 'https://raw.githubusercontent.com/shikato/pixiv_sk/master/loading.gif';
            $(loadingImg).css('position', 'absolute');
            $(loadingImg).attr('data-index', dataIndex);
            previewDiv.appendChild(loadingImg);
            // 要显示的预览图节点
            var loadImg = new Image();
            $(loadImg).attr('data-index', dataIndex);
            previewDiv.appendChild(loadImg);
            // 表示显示的是原图的图标
            var originIcon = new Image();
            originIcon.src = 'https://source.pixiv.net/www/images/pixivcomic-favorite.png';
            $(originIcon).css({ 'position': 'absolute', 'bottom': '0px', 'right': '0px', 'display': 'none' });
            $(originIcon).attr('data-index', dataIndex);
            previewDiv.appendChild(originIcon);
            // 点击图标新网页打开原图
            $(originIcon).click(function () {
                window.open($(previewDiv).children('img')[1].src);
            });
            $(previewDiv).css({ 'left': mousePos.x + 'px', 'top': mousePos.y + 'px' });

            // 显示预览图
            // args: 图片地址数组，下标，原图地址数组
            function viewImages(imgs, index, imgsOrigin) {
                if (!imgs || imgs.length == 0) return;
                if (index < 0) return;
                if (!imgsOrigin || imgsOrigin.length == 0 || imgs.length != imgsOrigin.length) return;
                if (!index) index = 0;

                // 绑定点击事件，Ctrl+左键 单击切换原图
                if ($(previewDiv).children('script').length == 0) {
                    loadImg.addEventListener('click', function (ev) {
                        // 按住 Ctrl 来回切换原图
                        if (ev.ctrlKey) {
                            if (loadImg.src.indexOf('origin') == -1) {
                                viewImages(allImgsOrigin, parseInt($($('.pixivPreview').children('img')[1]).attr('img-index')), allImgs);
                            } else {
                                viewImages(allImgs, parseInt($($('.pixivPreview').children('img')[1]).attr('img-index')), allImgsOrigin);
                            }
                        }
                        // 按住 Shift 点击图片新标签页打开原图
                        else if (ev.shiftKey) {
                            window.open(allImgsOrigin[parseInt($($('.pixivPreview').children('img')[1]).attr('img-index'))]);
                        }
                    });
                }
                // 多图时绑定点击事件，点击图片切换到下一张
                if (index == 0 && imgs.length != 1 && $(previewDiv).children('._work').length == 0) {
                    loadImg.addEventListener('click', function (e) {
                        if (e.ctrlKey || e.shiftKey) return;
                        var newIndex = parseInt($($('.pixivPreview').children('img')[1]).attr('img-index')) + 1;
                        if (newIndex == allImgs.length) newIndex = 0;
                        $('.pixivPreview').children('div').children('div').children('span')[0].innerHTML = (newIndex + 1) + '/' + allImgs.length;
                        if (loadImg.src.indexOf('origin') == -1) {
                            viewImages(allImgs, newIndex, allImgsOrigin);
                        } else {
                            viewImages(allImgsOrigin, newIndex, allImgs);
                        }
                    });
                }

                // 右上角张数标记
                if (imgs.length != 1 && index == 0 && $(previewDiv).children('._work').length == 0) {
                    var iconDiv = document.createElement('div');
                    iconDiv.innerHTML = '<div class="page-count"><div class="icon"></div><span>1/' + imgs.length + '</span></div>';
                    $(iconDiv).addClass('_work');
                    $(iconDiv).css({ 'position': 'absolute', 'top': '0px', 'display': 'none' });
                    $(iconDiv).attr('data-index', dataIndex);
                    $(iconDiv.childNodes).attr('data-index', dataIndex);
                    previewDiv.appendChild(iconDiv);
                }

                // 预加载
                loadImg.src = '';
                $(loadImg).css({ 'width': '', 'height': '', 'display': 'none' });
                $(loadingImg).css('display', '');
                $(originIcon).css('display', 'none');
                $(iconDiv).css({ 'display': 'none' });
                // 图片预加载完成
                loadImg.addEventListener('load', function () {
                    if (loadImg.src.indexOf('githubusercontent') != -1) return;
                    // 调整图片大小
                    var width = loadImg.width, screenWidth = document.documentElement.clientWidth;
                    var height = loadImg.height, screenHeight = document.documentElement.clientHeight;
                    var viewHeight, viewWidth;
                    // 长图
                    if (height > width) {
                        viewHeight = screenHeight / 2;
                        viewWidth = viewHeight / height * width;
                        var scale = 1.0;
                        while (viewWidth * scale > screenWidth / 2) {
                            scale -= 0.01;
                        }
                    }
                    // 宽图
                    else {
                        viewWidth = screenWidth / 2;
                        viewHeight = viewWidth / width * height;
                        var scale = 1.0;
                        while (viewHeight * scale > screenHeight / 2) {
                            scale -= 0.01;
                        }
                    }
                    $(loadImg).css({ 'height': viewHeight * scale + 'px', 'width': viewWidth * scale + 'px' });
                    $(previewDiv).css({ 'height': viewHeight * scale + 'px', 'width': viewWidth * scale + 'px' });
                    $(loadingImg).css({ 'left': viewWidth * scale / 2 - 24 + 'px', 'top': viewHeight * scale / 2 - 24 + 'px' });
                    $(loadImg).css('display', '');
                    $(loadingImg).css('display', 'none');
                    $(iconDiv).css({ 'display': '' });
                    if (loadImg.src.indexOf('origin') != -1) {
                        $(originIcon).css({ 'display': '' });
                    } else {
                        $(originIcon).css({ 'display': 'none' });
                    }
                    // 调整图片位置
                    adjustDivPos(loadImg, previewDiv, screenWidth, screenHeight);
                    // 第一次显示预览时将图片列表添加到末尾
                    if ($(previewDiv).children('script').length == 0) {
                        var s = document.createElement('script');
                        // 输出预览图URL
                        var tmp = "var allImgs=['";
                        tmp += imgs[0];
                        for (var i = 1; i < imgs.length; ++i) {
                            tmp += "','" + imgs[i];
                        }
                        tmp += "'];";
                        // 输出原图URL
                        tmp += "var allImgsOrigin=['";
                        tmp += imgsOrigin[0];
                        for (var i = 1; i < imgsOrigin.length; ++i) {
                            tmp += "','" + imgsOrigin[i];
                        }
                        tmp += "'];";
                        // 输出
                        s.innerHTML = tmp;
                        previewDiv.appendChild(s);
                    }
                });
                $(loadImg).attr('img-index', index);
                loadImg.src = imgs[index];
            }
            // 进行 http 请求，获取预览图链接
            var xmlHttp = new XMLHttpRequest();
            xmlHttp.onreadystatechange = function () {
                if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                    var resText = xmlHttp.responseText;
                    // 单图
                    try {
                        // 取得图片地址
                        // 预览图
                        var imgSource = RegExp('<div class="_layout-thumbnail ui-modal-trigger">[^>]*>').
                            exec(resText)[0].split('<')[2].split('\"')[1];
                        // 原图
                        var imgOrigin = RegExp('<div class="_illust_modal.*class="original-image').
                            exec(resText)[0].split('data-src="')[1].split('\"')[0];
                        viewImages([imgSource], 0, [imgOrigin]);
                        return;
                    } catch (e) {
                        // empty
                    }
                    // 多图
                    try {
                        var img, imgs = [];
                        var reg = new RegExp('https://i.pximg.net/img-master[^\"]*', 'g');
                        while ((img = reg.exec(resText.split('<section class=\"manga\">')[1].
                            split('</section>')[0])) !== null) {
                            imgs.push(img[0]);
                        }
                        // 推出来的原图URL，暂时没有想到效率高的办法（imgs.length 次xmlHttpRequest）
                        var imgsOrigin = [];
                        for (var i = 0; i < imgs.length; ++i) {
                            imgsOrigin.push(imgs[i].replace('img-master', 'img-original'));
                            imgsOrigin[i] = imgsOrigin[i].replace('_master1200', '');
                            // ?
                            //imgsOrigin[i] = imgsOrigin[i].replace('.jpg', '.png');
                        }
                        viewImages(imgs, 0, imgsOrigin);
                        return;
                    } catch (e) {
                        // empty
                    }
                }
            };
            // 动图，illustType 值为2
            if (imgData[dataIndex].illustType == 2) {
                $(previewDiv).children().remove();
                previewDiv.innerHTML = '<iframe width="600px" height="50%" src="https://www.pixiv.net/member_illust.php?mode=ugoira_view&illust_id=' +
                    $(picNode[dataIndex]).attr('data-id') + '#animePreview"/>';
                $(previewDiv).children('iframe').css('display', 'none');
                $(previewDiv).children('iframe').attr('data-index', dataIndex);
                var loadingImg = new Image();
                loadingImg.src = 'https://raw.githubusercontent.com/shikato/pixiv_sk/master/loading.gif';
                $(loadingImg).css('position', 'absolute');
                previewDiv.appendChild(loadingImg);
                return;
            }
            // 多图， pageCount 不为1
            else if (imgData[dataIndex].pageCount != 1) {
                xmlHttp.open('GET', 'https://www.pixiv.net/member_illust.php?mode=manga&illust_id=' +
                    $(picNode[dataIndex]).attr('data-id'), true);
            }
            // 单图
            else {
                xmlHttp.open('GET', 'https://www.pixiv.net/member_illust.php?mode=medium&illust_id=' +
                    $(picNode[dataIndex]).attr('data-id'), true);
            }
            xmlHttp.send(null);
        });
        // 鼠标移出图片
        $(picHref).mouseout(function (e) {
            // 鼠标移动到预览图上
            if ($(e.relatedTarget).attr('data-index') == $(this).attr('data-index')) {
                $('.pixivPreview').mouseleave(function (ev) {
                    if ($(ev.relatedTarget).attr('data-index') == $(this).attr('data-index')) {
                        // empty
                    }
                    else {
                        $('.pixivPreview').remove();
                    }
                });
            }
            // 非预览图上
            else {
                $('.pixivPreview').remove();
            }
        });
        // 鼠标移动，调整预览图位置
        $(picHref).mousemove(function (e) {
            if (e.ctrlKey) {
                return;
            }
            var screenWidth = document.documentElement.clientWidth;
            var screenHeight = document.documentElement.clientHeight;
            mousePos.x = e.pageX; mousePos.y = e.pageY;
            adjustDivPos($('.pixivPreview').children('img')[1], $('.pixivPreview')[0], screenWidth, screenHeight);
        });
        // 添加执行标记
        $(picDiv).addClass('prev');
    }
    // 调整预览 Div 的位置
    // arg: Div 中 <img> 标签，预览 Div，屏幕可视区宽，屏幕可视区高
    function adjustDivPos(loadImg, previewDiv, screenWidth, screenHeight) {
        // 调整图片位置
        var divX = mousePos.x + 5, divY = mousePos.y + 5;
        if (mousePos.x > screenWidth / 2) {
            try {
                divX -= $(loadImg).css('width').split('px')[0];
            }
            catch (e) {
                divX -= 24;
            }
            divX -= 10;
        }
        if ((mousePos.y - document.body.scrollTop) >
            screenHeight / 2) {
            try {
                divY -= $(loadImg).css('height').split('px')[0];
            }
            catch (e) {
                divY -= 24;
            }
            divY -= 10;
        }
        $(previewDiv).css({ 'left': divX + 'px', 'top': divY + 'px' });
    }
    // 添加多选框，加在 downloadButton() 中容易与其他脚本冲突
    function downloadMultiSelector() {
        // 表示是否选中的图标
        $(picHref).each(function () {
            var checkIcon = new Image();
            checkIcon.src = 'https://raw.githubusercontent.com/Ocrosoft/PixivPreviewer/master/unchecked.png';
            $(checkIcon).css({ 'position': 'absolute', 'top': '0px', 'left': '0px', 'display': 'none' });
            this.appendChild(checkIcon);
        });
    }
    // 添加下载按钮
    function downloadButton() {
        // 其他页面不启用
        if (location.href.indexOf('member_illust') != -1) return;
        // 下载模式按钮
        var downloadButton = document.createElement('li');
        downloadButton.innerHTML = '<i class="_icon-12 _icon-up" style="transform: rotateX(180deg);border-radius: 100%;"></i>';
        downloadButton.className = 'item';
        $(downloadButton).css({ 'margin-bottom': '10px', 'opacity': '0.2' });
        $('#back-to-top').parent()[0].insertBefore(downloadButton, $($('#back-to-top').parent()[0]).children()[0]);
        // 点击开闭下载模式
        $(downloadButton).click(function () {
            if ($(downloadButton).css('opacity') == '0.2') {
                $(downloadButton).css('opacity', '0.5');
                $($(downloadButton).children()[0]).css({ 'background': 'green' });
                // 开启下载模式
                // 显示多选框
                $(picHref).each(function () {
                    $(this.lastChild).css('display', '');
                });
                for (var i = 0; i < picDiv.length; ++i) {
                    // 覆盖在<a>上面的图
                    var layer = new Image();
                    layer.src = 'https://source.pixiv.net/www/images/common/transparent.gif';
                    $(layer).attr('data-index', i);
                    picDiv[i].appendChild(layer);
                    $(layer).css({ 'height': $(layer).parent().css('height'), 'width': $(layer).parent().css('width'), 'position': 'absolute', 'z-index': '999999' });
                    $(layer).click(function () {
                        if (picHref[$(this).attr('data-index')].lastChild.src.indexOf('unchecked') != -1) {
                            picHref[$(this).attr('data-index')].lastChild.src = 'https://raw.githubusercontent.com/Ocrosoft/PixivPreviewer/master/checked.png';
                        } else {
                            picHref[$(this).attr('data-index')].lastChild.src = 'https://raw.githubusercontent.com/Ocrosoft/PixivPreviewer/master/unchecked.png';
                        }
                    });
                }
            } else {
                $(downloadButton).css('opacity', '0.2');
                $($(downloadButton).children()[0]).css({ 'background': '' });
                // 添加覆盖提示层
                var screenWidth = document.documentElement.clientWidth;
                var screenHeight = document.documentElement.clientHeight;
                $('#fb-root')[0].innerHTML = '<p style="text-align:center;color:white;font-size:50px;">处理中<br/><span id="per">1/1</span></p>';
                $($('#fb-root').children()).css('margin-top', parseInt(screenHeight) / 2 - 40 + 'px');
                $('#fb-root').css({
                    'width': screenWidth + 'px', 'height': screenHeight + 'px', 'position': 'fixed',
                    'z-index': 999999, 'background-color': 'rgba(0,0,0,0.8)',
                    'left': '0px', 'top': '0px'
                });
                // 关闭下载模式
                var imgOriginList = []; var linkList = []; var imgCount = 0;
                for (var i = 0; i < picHref.length; ++i) {
                    if (picHref[i].lastChild.src.indexOf('unchecked') != -1) continue;
                    if (imgData[i].illustType == 2) {
                        linkList.push('https://www.pixiv.net/member_illust.php?mode=medium&illust_id=' +
                            $(picNode[i]).attr('data-id'));
                    }
                    else if (imgData[i].pageCount != 1) {
                        linkList.push('https://www.pixiv.net/member_illust.php?mode=manga&illust_id=' +
                            $(picNode[i]).attr('data-id'));
                    }
                    else {
                        linkList.push('https://www.pixiv.net/member_illust.php?mode=medium&illust_id=' +
                            $(picNode[i]).attr('data-id'));
                    }
                }
                $('#per')[0].innerText = '1/' + linkList.length;
                var xmlHttp = new XMLHttpRequest();
                xmlHttp.onreadystatechange = function () {
                    if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
                        var resText = xmlHttp.responseText;
                        // 先尝试匹配动图，再尝试匹配单图，最后匹配多图
                        // while (true) 用来跳出匹配，避免后面的 if 不执行
                        while (true) {
                            // 动图
                            try {
                                var src = RegExp(' <script>pixiv.context.illustId.*</script>').exec(resText)[0];
                                var reg = new RegExp('http[^"]*', 'g');
                                var normal = reg.exec(src)[0], full = reg.exec(src)[0];
                                while (full.indexOf('\\') != -1) full = full.replace('\\', '');
                                if (full) {
                                    imgOriginList.push(full);
                                    break;
                                }
                            } catch (e) {
                                // empty
                            }
                            // 单图
                            try {
                                // 取得图片地址
                                // 预览图
                                var imgSource = RegExp('<div class="_layout-thumbnail ui-modal-trigger">[^>]*>').
                                    exec(resText)[0].split('<')[2].split('\"')[1];
                                // 原图
                                var imgOrigin = RegExp('<div class="_illust_modal.*class="original-image').
                                    exec(resText)[0].split('data-src="')[1].split('\"')[0];
                                imgOriginList.push(imgOrigin);
                                break;
                            } catch (e) {
                                // empty
                            }
                            // 多图
                            try {
                                var img, imgs = [];
                                var reg = new RegExp('https://i.pximg.net/img-master[^\"]*', 'g');
                                while ((img = reg.exec(resText.split('<section class=\"manga\">')[1].
                                    split('</section>')[0])) !== null) {
                                    imgs.push(img[0]);
                                }
                                // 推出来的原图URL，暂时没有想到效率高的办法（imgs.length 次xmlHttpRequest）
                                var imgsOrigin = [];
                                for (var i = 0; i < imgs.length; ++i) {
                                    imgsOrigin.push(imgs[i].replace('img-master', 'img-original'));
                                    imgsOrigin[i] = imgsOrigin[i].replace('_master1200', '');
                                    // ?
                                    imgsOrigin[i] = imgsOrigin[i].replace('.jpg', '.png');
                                    imgOriginList.push(imgsOrigin[i]);
                                }
                                break;
                            } catch (e) {
                                // empty
                            }
                        }
                        if (++imgCount == linkList.length) {
                            // 隐藏多选框
                            $(picHref).each(function () {
                                this.lastChild.src = 'https://raw.githubusercontent.com/Ocrosoft/PixivPreviewer/master/unchecked.png';
                                $(this.lastChild).css('display', 'none');
                            });
                            $(picDiv).each(function () {
                                this.lastChild.remove();
                            });
                            var s = '';
                            $(imgOriginList).each(function () {
                                s += this + '\n';
                            });
                            prompt('复制到下载工具下载', s);
                            $('#fb-root')[0].outerHTML = '<div id="fb-root"></div>';
                        } else {
                            $('#per')[0].innerText = (imgCount + 1) + '/' + linkList.length;
                            xmlHttp.open('GET', linkList[imgCount], true);
                            xmlHttp.send(null);
                        }
                    }
                };
                if (linkList.length != 0) {
                    xmlHttp.open('GET', linkList[0], true);
                    xmlHttp.send(null);
                } else {
                    // 隐藏多选框
                    $(picHref).each(function () {
                        $(this.lastChild).css('display', 'none');
                    });
                }
            }
        });
    }

    getImageElements();
    // 开启预览
    activePreview();
    // 添加多选框
    downloadMultiSelector();
    // 添加下载按钮
    downloadButton();
}
/**
 * ---------------------------------------- 以下为 排序功能 部分 ----------------------------------------
 */
function pixiv_sk(callback) {
    // 每次加载的页数
    var GETTING_PAGE_COUNT = 3;
    // 收藏量在此以下的不显示
    var FAV_FILTER = 3;
    // true，使用新标签页打开图片；false，保持默认
    var IS_LINK_BLANK = true;
    // 加载中图片
    var LOADING_IMG = 'https://raw.githubusercontent.com/shikato/pixiv_sk/master/loading.gif';
    // 不合理的设定
    if (GETTING_PAGE_COUNT < 1 || FAV_FILTER < 0) return;
    // 当前已经取得的页面数量
    var mCurrentGettingPageCount = null;
    // 当前加载的页面 URL
    var mCurrentUrl = null;
    // 当前加载的是第几张页面
    var mCurrentPage = null;
    // 获取到的作品
    var mWorks = [];

    // 获取第 mCurrentPage 页的作品
    var getWorks = function (onloadCallback) {
        // 更新 URL
        var url = mCurrentUrl;
        if (mCurrentPage === 1) {
            url += ('&p=' + mCurrentPage);
        } else {
            url = mCurrentUrl.replace(/p=\d+/, 'p=' + mCurrentPage);
        }
        mCurrentUrl = url;

        var req = new XMLHttpRequest();
        req.open('GET', mCurrentUrl, true);
        req.onload = function (event) {
            // 加载成功，调用回调函数
            onloadCallback(req);
            req = null;
        };
        // 加载失败
        req.onerror = function (event) {
            alert('获取作品失败!');
            req = null;
        };

        req.send(null);
    };

    // 排序和筛选
    var filterAndSort = function () {
        // 收藏量低于 FAV_FILTER 的作品不显示
        mWorks.forEach(function (work, i) {
            var fav = work.bookmarkCount;//work.children('ul').children('li:first').children('a').text();
            if (fav < FAV_FILTER) {
                mWorks.splice(i, 1);
            } /*else {
                // 用新标签页打开图片
                if (IS_LINK_BLANK) {
                    work.children('a').attr('target', 'blank');
                }
            }*/
        });

        // 排序
        mWorks.sort(function (a, b) {
            var favA = a.bookmarkCount;
            var favB = b.bookmarkCount;
            if (favA === '') {
                favA = 0;
            } else {
                favA = parseInt(favA);
            }
            if (favB === '') {
                favB = 0;
            } else {
                favB = parseInt(favB);
            }
            if (favA > favB) {
                return -1;
            }
            if (favA < favB) {
                return 1;
            }
            return 0;
        });
    };

    mCurrentGettingPageCount = 0;
    mCurrentUrl = location.href;
    mCurrentPage = mCurrentUrl.match(/p=(\d+)/);

    if (mCurrentPage !== null) {
        mCurrentPage = parseInt(mCurrentPage[1]);
    }
    else {
        mCurrentPage = 1;
    }

    if (GETTING_PAGE_COUNT > 1) {
        // 显示加载中图片
        $('.column-search-result').children('div').hide();
        $('.column-search-result').prepend(
            '<div id="loading" style="width:50px;margin-left:auto;margin-right:auto;">'
            + '<img src="' + LOADING_IMG + '" /></div>'
        );

        // 翻页部分
        /*if ($('.pager-container').length == 1) {
            $('.ads_area_no_margin')[0].outerHTML = $('.pager-container')[0].parentNode.outerHTML;
        }*/
        try { $('.column-order-menu')[0].innerHTML = $('.column-order-menu')[1].innerHTML; }
        catch(e) { }
        if (mCurrentPage === 1) {
            $('.pager-container').empty().append(
                '<a href="' + mCurrentUrl + '" style="margin-right:15px;">&lt;&lt;</a>'
                + '<a href="' + mCurrentUrl + '&p=' + (mCurrentPage + GETTING_PAGE_COUNT) + '">&gt;</a>'
            );
        }
        else {
            $('.pager-container').empty().append(
                '<a href="' + mCurrentUrl.replace(/&p=\d+/, '') + '" style="margin-right:15px;">&lt;&lt;</a>'
                + '<a href="' + mCurrentUrl.replace(/p=\d+/, 'p=' + (mCurrentPage - GETTING_PAGE_COUNT)) + '" style="margin-right:10px;">&lt;</a>'
                + '<a href="' + mCurrentUrl.replace(/p=\d+/, 'p=' + (mCurrentPage + GETTING_PAGE_COUNT)) + '" style="margin-right:10px;">&gt;</a>'
            );
        }

        var onloadCallback = function (req) {
            mWorks.push($(req.responseText).find('#js-mount-point-search-result-list').attr('data-items'));

            mCurrentPage++;
            mCurrentGettingPageCount++;
            // 设定数量的页面加载完成
            if (mCurrentGettingPageCount == GETTING_PAGE_COUNT) {
                $('#loading').remove();
                clearAndUpdateWorks();
            } else {
                getWorks(onloadCallback);
            }
        };

        getWorks(onloadCallback);
    }
    else {
        mWorks.push($('#js-mount-point-search-result-list').attr('data-items'));
        clearAndUpdateWorks(mWorks);
    }

    function clearAndUpdateWorks() {
        var tmp = [];
        for (var i = 0; i < mWorks.length; i++) {
            var imgsOnePage = eval(mWorks[i]);
            for (var j = 0; j < imgsOnePage.length; j++) {
                tmp.push(imgsOnePage[j]);
            }
        }
        mWorks = tmp;
        filterAndSort();
        $('#js-mount-point-search-result-list').attr('data-items', JSON.stringify(mWorks));

        var divs = $($('#js-mount-point-search-result-list').children()[0]).children();
        var divHTML = divs[0].outerHTML;
        $('#js-mount-point-search-result-list').children('div').empty();
        for (var i = 0; i < mWorks.length; i++) {
            // 新建一个 DIV
            var div = document.createElement('div');
            $('#js-mount-point-search-result-list').children('div').append(div);
            div.outerHTML = divHTML;
            // 修改 outerHTML 后要重新获取对象
            div = $('#js-mount-point-search-result-list').children()[0].lastChild;
            // 图片的 <a> 标签
            var a = $(div).children('figure').children('div').children('a')[0];
            // 移除多图/动图标签
            $(a).children('div').remove();
            // 如果是多图添加多图标签
            if (mWorks[i].pageCount != 1) {
                var pageDiv = document.createElement('div');
                $(pageDiv).css({ '-webkit-box-flex': '0', '-ms-flex': 'none', 'flex': 'none', 'display': '-webkit-box', 'display': '-ms-flexbox', 'display': 'flex', '-webkit-box-align': 'center', '-ms-flex-align': 'center', 'align-items': 'center', 'z-index': '1', '-webkit-box-sizing': 'border-box', 'box-sizing': 'border-box', 'margin': '0 0 -24px auto', 'padding': '6px', 'height': '24px', 'background': 'rgba(0,0,0,.4)', 'border-radius': '0 0 0 4px', 'color': '#fff', 'font-size': '12px', 'line-height': '1', 'font-weight': '700' });
                var pageSpan = document.createElement('span');
                pageSpan.innerText = mWorks[i].pageCount;
                pageDiv.appendChild(pageSpan);
                var pageSpan2 = document.createElement('span');
                $(pageSpan2).css({ 'display': 'inline-block', 'margin-right': '4px', 'width': '10px', 'height': '12px', 'background': 'url(//source.pixiv.net/www/images/icon/multiple-pages-icon.svg)' });
                pageSpan.insertBefore(pageSpan2, pageSpan.firstChild);
                a.insertBefore(pageDiv, a.firstChild);
            }
            // 如果是动图添加动图标签
            if (mWorks[i].illustType == 2) {
                var animeDiv = document.createElement('div');
                $(animeDiv).css({ 'position': 'absolute', '-webkit-box-flex': '0', '-ms-flex': 'none', 'flex': 'none', 'width': '40px', 'height': '40px', 'background': 'url(//source.pixiv.net/www/js/bundle/f608d897f389e8161e230b817068526d.svg) 50% no-repeat', 'top': '50%', 'left': '50%', 'margin': '-20px 0 0 -20px' });
                a.appendChild(animeDiv);
            }
            // 图片 <img> 标签
            $($(a).children('img')[0]).attr('data-src', mWorks[i].url);
            $($(a).children('img')[0]).attr('src', mWorks[i].url);
            if (parseInt(mWorks[i].width) > parseInt(mWorks[i].height)) {
                $($(a).children('img')[0]).attr({ 'width': '198px', 'height': '' });
            } else {
                $($(a).children('img')[0]).attr({ 'width': '', 'height': '198px' });
            }
            // 喜欢按钮 <div> 标签
            $($(a).parent().children('div').children('div')[0]).attr('data-id', mWorks[i].illustId);
            $($(a).parent().children('div').children('div')[0]).attr('data-click-label', mWorks[i].illustId);
            // 举报按钮 <a> 标签
            a = $(a).parent().children('div').find('a');
            a.attr('href', a.attr('href').split('=')[0] + '=' + mWorks[i].illustId);
            // 标题、作者栏 <ul> 标签
            var ul = $(div).find('figcaption').children()[0];
            // 标题 <a> 标签
            a = $($(ul).children('li')[0]).children('a');
            a.attr('href', a.attr('href').split('id=')[0] + 'id=' + mWorks[i].illustId);
            a.attr('title', mWorks[i].illustTitle);
            a[0].innerText = mWorks[i].illustTitle;
            // 作者 <a> 标签
            a = $($(ul).children('li')[1]).children('a');
            a.attr('href', a.attr('href').split('=')[0] + '=' + mWorks[i].userId);
            a.attr('title', mWorks[i].userName);
            a.attr('data-user_id', mWorks[i].userId);
            a.attr('data-user_name', mWorks[i].userName);
            a.find('div').css('background', 'url(' + mWorks[i].userImage + ') center top / cover no-repeat');
            a[0].lastChild.innerText = mWorks[i].userName;
            // 收藏量
            if ($(ul.lastChild).css('position') == 'relative') {
                $(ul.lastChild).remove();
            }
            if (mWorks[i].bookmarkCount != 0) {
                var li = document.createElement('li');
                ul.appendChild(li);
                li.outerHTML = '<li style="position: relative;"><ul class="count-list"><li><a href="/bookmark_detail.php?illust_id=' + mWorks[i].illustId + '" class="_ui-tooltip bookmark-count" data-tooltip="' + mWorks[i].bookmarkCount + '件のブックマーク"><i class="_icon sprites-bookmark-badge"></i>' + mWorks[i].bookmarkCount + '</a></li></ul></li>';
            }
        }
        // 恢复显示
        $('.column-search-result').children('div').show();
        if (callback) {
            callback();
        }
    }
}
/**
 * ---------------------------------------- 以下为 主函数 部分 ----------------------------------------
 */
(function main() {
    if (location.href.indexOf('member_illust.php') != -1) {
        return;
    }
    // 预览，下载
    var itv = setInterval(function () {
        try {
            getImageElements();
            // 排序
            if (picDiv.length > 0) {
                pixiv_sk(pixivPreviewer); // 排序完成后调用预览
                clearInterval(itv);
            }
        }
        catch (e) {
            alert('出现错误!');
            clearInterval(itv);
        }
    }, 500);
})();