//当前项目入口文件
//本文件仅实现显示新闻列表，提交新闻，显示提交的新闻详情三个功能
//当前index1是原始文件，未经过封装和模块化

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
    //当用户请求 / 或 /index 时，显示新闻列表 -get请求
    //当用户请求 /item 时，显示新闻详情 -get请求
    //当用户请求 /submit 时，显示添加新闻页面 -get请求
    //当用户请求 /add 时，将用户提交的新闻保存到 data.json文件中 -get请求
    //当用户请求 /add 时，将用户提交的新闻保存到 data.json文件中 -post请求
    //将用户请求的url和method转换为小写字母
    req.url = req.url.toLowerCase();
    req.method = req.method.toLowerCase();

    //通过url模块 调用url.parse()方法解析用户提交的url(req.url)成一个对象 第二个参数决定解析query
    var urlObj = url.parse(req.url,true);

    //先根据用户请求的路径，将对应的HTML页面显示出来
    if(req.url === '/' || req.url === '/index' && req.method === 'get'){
        // //读取index.html并返回
        // fs.readFile(path.join(__dirname,'views','index.html'),function(err,data){
        //     if(err){
        //     throw err;
        //     }
        //     res.end(data);
        // });
        //封装后：
        //res.render(path.join(__dirname,'views','index.html'));
        //1.读取data.json文件中的数据，并将读取到的数据转换为list数组
        
        fs.readFile(path.join(__dirname,'data','data.json'),'utf8',function(err,data){
            if(err && err.code!=='ENOENT'){
                throw err;
            }
            //读取到的新闻数据
            var list_news = JSON.parse(data || '[]');
            //2.在服务器端使用模板引擎，将list中的数据和index中的内容结合渲染给客户端
            //因为现在要渲染的index.html中需要用到模板数据，所以给render函数增加了第二个参数，传递模板数据，参数是个对象
            res.render(path.join(__dirname,'views','index.html'),{list:list_news});
        });
    }else if(req.url === '/submit' && req.method === 'get'){
        // //读取submit.html并返回
        // fs.readFile(path.join(__dirname,'views','submit.html'),function(err,data){
        //     if(err){
        //     throw err;
        //     }
        //     res.end(data);
        // });
        //封装后：
        res.render(path.join(__dirname,'views','submit.html'));

    }else if(urlObj.pathname === '/item' && req.method === 'get'){
        // //读取details.html并返回
        // fs.readFile(path.join(__dirname,'views','datails.html'),function(err,data){
        //     if(err){
        //     throw err;
        //     }
        //     res.end(data);
        // });
        //封装后：
        //res.render(path.join(__dirname,'views','datails.html'));

        //1.获取当前用户请求的新闻的id
        //2.读取data.json文件中的数据，根据id找到对应新闻
        //3.调用res.render()进行模板引擎的渲染
        fs.readFile(path.join(__dirname, 'data', 'data.json'), 'utf8', function(err, data) {
            if (err && err.code !== 'ENOENT') {
                throw err;
              }
            var list_news = JSON.parse(data || '[]');
            var model = null;
            //循环list_news中的数据找到和id值相等的数据
            for (var i = 0; i < list_news.length; i++) {

                // 判断集合中是否有与用户提交的 id 相等的新闻
                if (list_news[i].id.toString() === urlObj.query.id) {
                  // 如果找到了相等的新闻，则将其记录下来
                  model = list_news[i];
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
        //表示get方法提交新闻
        //要获取用户提交的数据需要使用url模块(内置模块)
        //get提交数据，则可以通过req.url直接获取数据，但是使用起来不方便(需要自己去截取字符获取想要的数据)
        //通过url模块可以将用户提交的数据解析成一个json对象，使用起来很方便
        //1.获取用户提交过来的新闻数据 2.将数据提交到data.json文件中 3.跳转到新闻列表页
        
        //读取data.json文件中的数据，并将读取到的数据转换为一个数组
        //读取文件时可以直接写一个utf8编码，这样回调函数中的data就是一个字符串了
        fs.readFile(path.join(__dirname,'data','data.json'),'utf-8',function(err,data){
            //第一次访问网站，data.json文件不存在，肯定会有错误
            //读取文件出错但是不是文件不存在的错误才抛出异常
            //解决data数据被覆盖的问题
            if(err && err.code!=='ENOENT'){
                throw err;
            }
            //如果读取到数据，就将data转换为数组，如果没有读数据就把[]转换为空数组
            var list = JSON.parse(data || '[]');

            //在把新闻添加到list之前为新闻添加一个id属性
            urlObj.query.id = list.length;

            list.push(urlObj.query);
            fs.writeFile(path.join(__dirname,'data','data.json'),JSON.stringify(list),function(err){
                if(err){
                    throw err;
                }
                console.log('ok');
                //设置响应报文头，高速浏览器执行一次页面跳转
                //重定向
                res.statusCode=302;
                res.statusMessage='Found';
                res.setHeader('Location','/');
                res.end();
            });

        });

    }else if(req.url === '/add' && req.method === 'post'){
        //表示post方法提交新闻
        //1.读取data.json文件中的数据 2.将读取到的数据转换为list数组 3.向list数组中push一条新闻 4.将list数组转换为字符串重新写入data.json文件中 5.重定向
        fs.readFile(path.join(__dirname,'data','data.json'),'utf-8',function(err,data){
            //第一次访问网站，data.json文件不存在，肯定会有错误
            //读取文件出错但是不是文件不存在的错误才抛出异常
            //解决data数据被覆盖的问题
            if(err && err.code!=='ENOENT'){
                throw err;
            }
            //如果读取到数据，就将data转换为数组，如果没有读数据就把[]转换为空数组
            var list = JSON.parse(data || '[]');
            //获取用户 post 提交的数据
            //因为post提交数据的数据量可能比较大，所以会分多次提交
            //此时要想在服务器中获取用户提交的所有数据，就必须监听res事件的data事件(因为浏览器每次提交一部分数据到服务器就会触发一次data事件)
            //当res事件的end事件被触发的时候就表示浏览器把所有数据都提交到服务器
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
                //console.log(postBody);

                //在把新闻添加到list之前为新闻添加一个id属性
                postBody.id = list.length;

                //将用户提交的新闻push到list中
                list.push(postBody);
                //将新的list数组写入data.json文件中
                fs.writeFile(path.join(__dirname,'data','data.json'),JSON.stringify(list),function(err){
                    if(err){
                        throw err;
                    }
                    console.log('ok');
                    //设置响应报文头，高速浏览器执行一次页面跳转
                    //重定向
                    res.statusCode=302;
                    res.statusMessage='Found';
                    res.setHeader('Location','/');
                    res.end();
                });

            });

        });


    }else if(req.url.startsWith('/resources')&& req.method === 'get'){
        // //如果用户请求是以/resources开头，并且是get请求，则认为用户是请求静态资源
        // fs.readFile(path.join(__dirname,req.url),function(err,data){
        //     if(err){
        //         res.writeHead(404,'Not Found',{'Content-Typr':'text/html;charset=utf-8'});         
        //         res.end('404 , Not Found');
        //         return;  
        //     }
        //     //mime返回请求的后缀
        //     res.setHeader('Content-Type',mime.getType(req.url));
        //     res.end(data);
        // });
        //封装后：
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

////封装一个render函数
// function render(filename,res){

//     fs.readFile(filename,function(err,data){
//         if(err){
//             res.writeHead(404,'Not Found',{'Content-Typr':'text/html;charset=utf-8'});         
//             res.end('404 , Not Found');
//             return;  
//         }
//         //mime返回请求的后缀对应的类型
//         res.setHeader('Content-Type',mime.getType(filename));
//         res.end(data);
//     });
// }
//下一步挂载到res对象

