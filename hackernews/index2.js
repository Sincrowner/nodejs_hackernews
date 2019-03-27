//当前项目入口文件
//本文件仅实现显示新闻列表，提交新闻，显示提交的新闻详情三个功能
//当前index2是封装后，未经过模块化
//不必要的注释删除

//1.加载http模块
var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var url = require('url');
var querystring = require('querystring');
var _ = require('underscore');

//2.创建服务
http.createServer(function(req,res){

    //将render函数挂载到res对象上，可以通过res.render()来访问
    res.render = function (filename,tplData){

        fs.readFile(filename,function(err,data){
            if(err){
                res.writeHead(404,'Not Found',{'Content-Typr':'text/html;charset=utf-8'});         
                res.end('404, Not Found');
                return;  
            }
            if(tplData){
                //如果用户传递了模板数据，表示要进行模板替换，使用underscore的template方法进行替换
                //data是buffer对象，要转换
                //template返回值是一个函数
                var fn = _.template(data.toString('utf8'));
                data = fn(tplData);
                //等价于
                //_.template(data.toString('utf8'))(tplData);
            }
            //mime返回请求的后缀对应的类型
            res.setHeader('Content-Type', mime.getType(filename));
            res.end(data);
        });
    };

    //设计路由
    req.url = req.url.toLowerCase();
    req.method = req.method.toLowerCase();

    //通过url模块 调用url.parse()方法解析用户提交的url(req.url)成一个对象 第二个参数决定解析query
    var urlObj = url.parse(req.url,true);

    //先根据用户请求的路径，将对应的HTML页面显示出来
    if(req.url === '/' || req.url === '/index' && req.method === 'get'){
       
        //1.读取data.json文件中的数据，并将读取到的数据转换为list数组
        readNewsData(function(list){
            //2.在服务器端使用模板引擎，将list中的数据和index中的内容结合渲染给客户端
            res.render(path.join(__dirname,'views','index.html'),{list:list});
        });

    }else if(req.url === '/submit' && req.method === 'get'){
        //读取submit.html并返回
        res.render(path.join(__dirname,'views','submit.html'));

    }else if(urlObj.pathname === '/item' && req.method === 'get'){
        //读取details.html并返回
        //1.获取当前用户请求的新闻的id
        //2.读取data.json文件中的数据，根据id找到对应新闻
        //3.调用res.render()进行模板引擎的渲染
        readNewsData(function (list) {  
            var model = null;
            //循环list_news中的数据找到和id值相等的数据
            for (var i = 0; i < list.length; i++) {

                // 判断集合中是否有与用户提交的 id 相等的新闻
                if (list[i].id.toString() === urlObj.query.id) {
                  // 如果找到了相等的新闻，则将其记录下来
                  model = list[i];
                  break;
                }
            }

            if (model) {
                res.render(path.join(__dirname,'views','details.html'),{ item: model });
                //res.render(path.join(__dirname,'views','details.html'),{item:model});
            }else{
                res.end('No Such Item');
            }
        });

    } else if(req.url.startsWith('/add') && req.method === 'get'){

        //1.读取data.json文件的数据
        readNewsData(function(list){
            //2.为用户提交的数据增加一个id属性，并把新闻对象push到list中
            urlObj.query.id = list.length;
            list.push(urlObj.query);
            //3写入data.json文件
            writeNewsData(JSON.stringify(list),function(){
                //重定向
                res.statusCode=302;
                res.statusMessage='Found';
                res.setHeader('Location','/');
                res.end();
            });

        });

    }else if(req.url === '/add' && req.method === 'post'){
       
        //读取data.json
        readNewsData(function(list){
            //2.获取用户提交的数据
            postBodyData(req,function(postData){
                //3.增加一个id属性
                postData.id = list.length;
                list.push(postData);

                //4.写入文件
                writeNewsData(JSON.stringify(list),function(){
                    //重定向
                    res.statusCode = 302;
                    res.statusMessage = 'Found';
                    res.setHeader('Location','/');
                    res.end();
                });
            });
        });

    }else if(req.url.startsWith('/resources')&& req.method === 'get'){

        res.render(path.join(__dirname,req.url));

    }else{
        //可以新建一个404html页面调用
        res.writeHead(404,'Not Found',{
            'Content-Type':'text/html ; charset=utf-8'
        });
        res.end('404,Page Not Found');
    }

}).listen(9090,function(){
    console.log('http://localhost:9090');
});

//封装一个读取datajson文件的函数
function readNewsData(callback){
    fs.readFile(path.join(__dirname, 'data', 'data.json'), 'utf8', function(err, data) {
        if (err && err.code !== 'ENOENT') {
            throw err;
          }
        var list = JSON.parse(data || '[]');
        //通过调用回调函数callback()将读取到的数据list，传递出去
        callback(list);
    });
}


//封装一个写入data.json文件的函数
function writeNewsData(data,callback){

    fs.writeFile(path.join(__dirname,'data','data.json'),data,function(err){
        if(err){
            throw err;
        }
        //调用callback()来执行当写入数据完毕后的操作
        callback(); 
    });
}

//封装一个获取用户post提交的数据的方法
function postBodyData(req,callback){
    var array=[];//声明一个数组保存每次提交过来的数据
            req.on('data',function(chunk){
                //此处的chunk就是本次浏览器提交过来的一部分数据，数据类型是buffer，chunk是buffer对象
                array.push(chunk);
            });
            req.on('end',function(){
                //在这个事件中将array汇总起来，每个buffer对象集合起来转换为一个buffer对象
                var postBody = Buffer.concat(array);
                //转换为字符串
                postBody = postBody.toString('utf8');
                //使用querystring模块的函数把post请求的查询字符串转换为一个json对象
                postBody = querystring.parse(postBody);

                //把用户post提交过来的数据传递出去
                callback(postBody);

            }); 

}