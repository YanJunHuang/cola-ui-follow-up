(function() {
  cola(function(model) {
    var errorCount, login, loginCallback, longPollingTimeOut, showLoginMessage;
    model.describe("menus", {
      provider: {
        url: App.prop("service.menus")
      }
    });
    model.describe("user", {
      provider: {
        url: App.prop("service.user.detail")
      }
    });
    model.dataType({
      name: "Login",
      properties: {
        userName: {
          validators: {
            $type: "required",
            message: ""
          }
        },
        password: {
          validators: {
            $type: "required",
            message: ""
          }
        }
      }
    });
    model.describe("login", "Login");
    model.set("login", {});
    model.set("messages", {});
    errorCount = 0;
    longPollingTimeOut = null;
    window.refreshMessage = function() {
      var options;
      options = {};
      if (longPollingTimeOut) {
        clearTimeout(longPollingTimeOut);
      }
      if (App.prop("longPollingTimeout")) {
        options.timeout = App.prop("longPollingTimeout");
      }
      return $.ajax(App.prop("service.messagePull"), options).done(function(messages) {
        var i, len, message;
        if (messages) {
          errorCount = 0;
          for (i = 0, len = messages.length; i < len; i++) {
            message = messages[i];
            model.set("messages." + message.type, message.content);
          }
        }
        if (App.prop("liveMessage")) {
          return longPollingTimeOut = setTimeout(refreshMessage, App.prop("longPollingInterval"));
        }
      }).error(function(xhr, status, ex) {
        if (App.prop("liveMessage")) {
          if (status === "timeout") {
            return longPollingTimeOut = setTimeout(refreshMessage, App.prop("longPollingInterval"));
          } else {
            errorCount++;
            return longPollingTimeOut = setTimeout(refreshMessage, 5000 * Math.pow(2, Math.min(6, errorCount - 1)));
          }
        }
      });
    };
    longPollingTimeOut = setTimeout(refreshMessage, 1000);
    refreshMessage();
    loginCallback = null;
    window.login = function(callback) {
      cola.widget("loginDialog").show();
      if (callback && typeof callback === "function") {
        return loginCallback = callback;
      }
    };
    login = function() {
      var data;
      data = model.get("login");
      cola.widget("containerSignIn").addClass("loading");
      return $.ajax({
        type: "POST",
        url: App.prop("service.login"),
        data: JSON.stringify(data.toJSON()),
        contentType: "application/json"
      }).done(function(result) {
        var callback;
        cola.widget("containerSignIn").removeClass("loading");
        if (!result.type) {
          showMessage(result.message);
          return;
        }
        cola.widget("loginDialog").hide();
        if (loginCallback) {
          callback = loginCallback;
          loginCallback = null;
          return callback();
        }
      }).fail(function() {
        cola.widget("containerSignIn").removeClass("loading");
      });
    };
    model.widgetConfig({
      loginDialog: {
        $type: "dialog",
        width: 400
      },
      subMenuTree: {
        $type: "tree",
        autoExpand: true,
        bind: {
          expression: "menu in subMenu",
          child: {
            recursive: true,
            expression: "menu in menu.menus"
          }
        },
        itemClick: function(self, arg) {
          var data, menus;
          data = arg.item.get("data").toJSON();
          menus = data.menus;
          if (menus && menus.length > 0) {
            return;
          } else {
            App.open(data.path, data);
            cola.widget("subMenuLayer").hide();
          }
        }
      },
      subMenuLayer: {
        beforeShow: function() {
          return $("#viewTab").parent().addClass("lock");
        },
        beforeHide: function() {
          return $("#viewTab").parent().removeClass("lock");
        }
      }
    });
    showLoginMessage = function(content) {
      return cola.widget("formSignIn").setMessages([
        {
          type: "error",
          text: content
        }
      ]);
    };
    model.action({
      signIn: function() {
        var data;
        cola.widget("formSignIn").setMessages(null);
        data = model.get("login");
        if (data.validate()) {
          return login();
        } else {
          return showLoginMessage("用户名或密码不能为空！");
        }
      },
      dropdownIconVisible: function(item) {
        var menus, result;
        menus = item.get("menus");
        result = false;
        if (menus && menus.entityCount > 0) {
          result = true;
        }
        return result;
      },
      showUserSidebar: function() {
        return cola.widget("userSidebar").show();
      },
      logout: function() {
        return $.ajax({
          type: "POST",
          url: App.prop("service.logout")
        }).success(function(result) {
          if (result) {
            return window.location.reload();
          }
        }).fail(function() {
          alert("退出失败，请检查网络连接！");
        });
      },
      menuItemClick: function(item) {
        var data, i, len, menu, menus, recursive;
        data = item.toJSON();
        menus = data.menus;
        recursive = function(d) {
          var i, len, ref, results;
          if (d.menus && d.menus.length > 0) {
            ref = d.menus;
            results = [];
            for (i = 0, len = ref.length; i < len; i++) {
              item = ref[i];
              results.push(recursive(item));
            }
            return results;
          } else {
            d.menus = null;
            return d.hasChild = false;
          }
        };
        if (menus && menus.length > 0) {
          for (i = 0, len = menus.length; i < len; i++) {
            menu = menus[i];
            recursive(data);
          }
          model.set("subMenu", menus);
          model.set("currentMenu", data);
          return cola.widget("subMenuLayer").show();
        } else {
          model.set("subMenu", []);
          cola.widget("subMenuLayer").hide();
          return App.open(data.path, data);
        }
      },
      hideSubMenuLayer: function() {
        return cola.widget("subMenuLayer").hide();
      },
      toggleSidebar: function() {
        var $dom, className;
        className = "collapsed";
        $dom = $("#frameworkSidebarBox");
        return $dom.toggleClass(className, !$dom.hasClass(className));
      },
      messageBtnClick: function() {
          var action;
          action = App.prop("message.action");
          if (action && typeof action === "object") {
              App.open(action.path, action);
          }
      },
      taskBtnClick: function() {
          var action;
          action = App.prop("task.action");
          if (action && typeof action === "object") {
              App.open(action.path, action);
          }
      },
      closeTab: function () {
          var keycode = event.keyCode==null?event.which:event.keyCode;
          var viewTab = cola.widget("viewTab");
          if (keycode===87) { // 快捷键w,关闭当前标签页
              viewTab.removeTab(viewTab.get("currentTab"));
          }
      }
    });
    $("#frameworkSidebar").accordion({
      exclusive: false
    }).delegate(".menu-item", "click", function() {
      $("#frameworkSidebar").find(".menu-item.current-item").removeClass("current-item");
      return $fly(this).addClass("current-item");
    });
    // 菜单提示tip
    tipLabel=function($dom,event) {
      // 当菜单收缩后启用提示功能
      if (!$("#frameworkSidebarBox").hasClass("collapsed")) return;
      var _this = $($dom);
      var _parentDom = $($dom).parent();
      var tooltip = $("<div class='just-tooltip'><div class='just-con'>" + _this.text() + "</div>" + "<span class='just-right'></span></div>");
      $("body").append(tooltip);
      var div = $("div.just-tooltip");
      div.css({"top":(_this.offset().top)+"px","left":(_parentDom.outerWidth()+10)+"px","opacity":0.6});
      div.animate({left:(_parentDom.outerWidth())+"px",opacity:'0.9'},"normal");
    };
    tipLabelOut=function() {
      $("div.just-tooltip").remove();
    };

    return $("#rightContainer>.layer-dimmer").on("click", function() {
      return cola.widget("subMenuLayer").hide();
    });
  });

  cola.ready(function() {
      var workbench;
      workbench = App.prop("workbench");
      if (workbench) {
          return App.open(workbench.path, workbench);
      }
  });

}).call(this);
