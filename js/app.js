$(document).ready(function () {
  $("#modal-open-btn").click(function () {
      $("#modal-cnt").removeClass("hidden");
  }),
      $("#modal-close-btn").click(function () {
          $("#modal-cnt").addClass("hidden");
      });
  zenscroll.setup(550, 0),
      $("#menu-btn").click(function () {
          $("#menu-cnt").hasClass("overflow-hidden") && $("#menu-cnt").removeClass("lg1:-right-80 md1:-right-64 -right-48 overflow-hidden").addClass("right-0");
      }),
      $("#close-btn").click(function () {
          $("#menu-cnt").hasClass("overflow-hidden") ||
              ($("#menu-cnt").removeClass("right-0").addClass("lg1:-right-80 md1:-right-64 -right-48"),
              setTimeout(() => {
                  $("#menu-cnt").addClass("overflow-hidden");
              }, 500));
      });
  for (var e = 0; e < $(".h-screen").length; e++)
      $(".h-screen")
          .eq(e)
          .css({ height: `${$(window).height()}` });
  $("#parent").css({ height: `${$("#child").outerWidth()}` }),
      $("#elms-parent").css({ height: $(window).height() - $("#get-height > div:nth-child(1)").outerHeight() + "px" }),
      $("#elms-parent > div:nth-child(2) > div").outerHeight() > $(window).height() - $("#get-height > div:nth-child(1)").outerHeight() &&
          ($("#elms-parent > div:nth-child(2)").addClass("overflow-auto"),
          $("#elms-parent > div:nth-child(2)").attr("dir", "rtl").removeClass("flex justify-center items-center"),
          $("#elms-parent > div:nth-child(2) > div").attr("dir", "ltr").addClass("mx-auto"));
  var t = setInterval(function () {
      for (var e = 0; e < $("article > div:nth-child(2) > div > div:nth-child(1) > div:last-child > img").length; e++) {
          var t = $("article > div:nth-child(2) > div > div:nth-child(1) > div:last-child > img").eq(e);
          $(t).outerHeight(!0) > $(window).height() / 2 && ($(t).parent().removeClass("flex justify-center items-center").addClass("overflow-auto"), $(t).addClass("mx-auto"));
      }
      for (var i = 0; i < $("article > div:nth-child(2) > div > div:nth-child(2) > div:last-child > img").length; i++) {
          var a = $("article > div:nth-child(2) > div > div:nth-child(2) > div:last-child > img").eq(i);
          $(a).outerHeight(!0) > $(window).height() / 2 && ($(a).parent().removeClass("flex justify-center items-center").addClass("overflow-auto"), $(a).addClass("mx-auto"));
      }
      for (var s = 0; s < $("article > div:nth-child(2) > div > div:nth-child(3) > div:last-child > img").length; s++) {
          var l = $("article > div:nth-child(2) > div > div:nth-child(3) > div:last-child > img").eq(s);
          $(l).outerHeight(!0) > $(window).height() / 2 && ($(l).parent().removeClass("flex justify-center items-center").addClass("overflow-auto"), $(l).addClass("mx-auto"));
      }
  }, 1);
  if (
      ($("#toggle-btn").click(function () {
          "images/icons/showcase-none.png" == $("#toggle-btn > img").attr("src")
              ? ($("#toggle-btn > img").attr("src", "images/icons/showcase-all.png"), $("#download-form").css({ display: "none" }), $("#show-label").css({ display: "none" }))
              : ($("#toggle-btn > img").attr("src", "images/icons/showcase-none.png"), $("#download-form").removeAttr("style"), $("#show-label").removeAttr("style"));
      }),
      $(window).resize(function () {
          for (var e = 0; e < $(".h-screen").length; e++)
              $(".h-screen")
                  .eq(e)
                  .css({ height: `${$(window).height()}` });
          $("#parent").css({ height: `${$("#child").outerWidth()}` }),
              $("#elms-parent").css({ height: "0px" }),
              $("#elms-parent > div:nth-child(2)").removeClass("overflow-auto"),
              $("#elms-parent > div:nth-child(2)").removeAttr("dir").addClass("flex justify-center items-center"),
              $("#elms-parent > div:nth-child(2) > div").removeAttr("dir").removeClass("mx-auto"),
              $("#elms-parent").css({ height: $(window).height() - $("#get-height > div:nth-child(1)").outerHeight() + "px" }),
              $("#elms-parent > div:nth-child(2) > div").outerHeight() > $(window).height() - $("#get-height > div:nth-child(1)").outerHeight()
                  ? ($("#elms-parent > div:nth-child(2)").addClass("overflow-auto"),
                    $("#elms-parent > div:nth-child(2)").attr("dir", "rtl").removeClass("flex justify-center items-center"),
                    $("#elms-parent > div:nth-child(2) > div").attr("dir", "ltr").addClass("mx-auto"))
                  : ($("#elms-parent > div:nth-child(2)").removeClass("overflow-auto"),
                    $("#elms-parent > div:nth-child(2)").removeAttr("dir").addClass("flex justify-center items-center"),
                    $("#elms-parent > div:nth-child(2) > div").removeAttr("dir").removeClass("mx-auto")),
              clearInterval(t);
          for (var a = 0; a < $("article > div:nth-child(2) > div > div:nth-child(1) > div:last-child > img").length; a++) {
              var s = $("article > div:nth-child(2) > div > div:nth-child(1) > div:last-child > img").eq(a);
              $(s).outerHeight(!0) > $(window).height() / 2
                  ? ($(s).parent().removeClass("flex justify-center items-center").addClass("overflow-auto"), $(s).addClass("mx-auto"))
                  : ($(s).parent().removeClass("overflow-auto").addClass("flex justify-center items-center"), $(s).removeClass("mx-auto"));
          }
          for (var l = 0; l < $("article > div:nth-child(2) > div > div:nth-child(2) > div:last-child > img").length; l++) {
              var o = $("article > div:nth-child(2) > div > div:nth-child(2) > div:last-child > img").eq(l);
              $(o).outerHeight(!0) > $(window).height() / 2
                  ? ($(o).parent().removeClass("flex justify-center items-center").addClass("overflow-auto"), $(o).addClass("mx-auto"))
                  : ($(o).parent().removeClass("overflow-auto").addClass("flex justify-center items-center"), $(o).removeClass("mx-auto"));
          }
          for (var d = 0; d < $("article > div:nth-child(2) > div > div:nth-child(3) > div:last-child > img").length; d++) {
              var n = $("article > div:nth-child(2) > div > div:nth-child(3) > div:last-child > img").eq(d);
              $(n).outerHeight(!0) > $(window).height() / 2
                  ? ($(n).parent().removeClass("flex justify-center items-center").addClass("overflow-auto"), $(n).addClass("mx-auto"))
                  : ($(n).parent().removeClass("overflow-auto").addClass("flex justify-center items-center"), $(n).removeClass("mx-auto"));
          }
          if ($(window).outerWidth() >= 750)
              for (e = 0; e < $(".h-screen-2").length; e++)
                  $(".h-screen-2")
                      .eq(e)
                      .css({ height: `${$(window).height()}` });
          if ($(window).outerWidth() < 750)
              for (e = 0; e < $(".h-screen-2").length; e++)
                  $(".h-screen-2")
                      .eq(e)
                      .css({ height: "" + 2 * $(window).height() });
          $("#go-button").click(), i--, $("#number").text(i), $("#log-txt > div:nth-child(1), #log-txt > div:nth-child(2)").remove();
      }),
      $(window).outerWidth() >= 750)
  )
      for (e = 0; e < $(".h-screen-2").length; e++)
          $(".h-screen-2")
              .eq(e)
              .css({ height: `${$(window).height()}` });
  if ($(window).outerWidth() < 750)
      for (e = 0; e < $(".h-screen-2").length; e++)
          $(".h-screen-2")
              .eq(e)
              .css({ height: "" + 2 * $(window).height() });
  var i = 0;
  $("#number").text(i),
      $("#go-button").click(function () {
          i++,
              $("#number").text(i),
              i % 2 == 0
                  ? $("#log-txt").html(
                        `\n\t\t\t\t  <div class="text-right">${$("#maze-style-selector").val()} maze generated</div>\n\t\t\t\t  <div class="text-right">${$("#maze-algorithm-selector").val()} method selected</div>\n\t\t\t\t\t${$(
                            "#log-txt"
                        ).html()}`
                    )
                  : $("#log-txt").html(
                        `\n\t\t\t\t\t<div class="text-left">${$("#maze-style-selector").val()} maze generated</div>\n\t\t\t\t\t<div class="text-left">${$("#maze-algorithm-selector").val()} method selected</div>\n\t\t\t\t\t${$(
                            "#log-txt"
                        ).html()}`
                    );
      }),
      $(window).scroll(function () {
          var e = `#a-${Math.round($("html").scrollTop() / $(window).height()) + 0}`,
              t = `#a-${Math.round($("html").scrollTop() / $(window).height()) + 2}`;
          $("#up_btn").attr("href", e),
              $("#down_btn").attr("href", t),
              $("html").scrollTop() >= 9 * $(window).height() + 4
                  ? $("#down_btn").removeClass("lg1:bottom-8 md1:bottom-6 bottom-4").addClass("-bottom-12")
                  : $("#down_btn").removeClass("-bottom-12").addClass("lg1:bottom-8 md1:bottom-6 bottom-4"),
              $("html").scrollTop() >= $(window).height() - 4 ? $("#up_btn").removeClass("-top-12").addClass("lg1:top-8 md1:top-6 top-4") : $("#up_btn").removeClass("lg1:top-8 md1:top-6 top-4").addClass("-top-12"),
              $(window).scrollTop() >= $(window).height() - 2 ? $("#show-label, #toggle-btn").removeClass("hidden").addClass("flex") : $("#show-label, #toggle-btn").removeClass("flex").addClass("hidden");
      }),
      setTimeout(() => {
          s();
      }, 0);
  var a = -1;
  function s() {
      3 == ++a && (a = 0);
      for (var e = 0; e < 3; e++)
          for (var t = 0; t < $(".img-group").length; t++)
              $(".img-group .dimension-group")
                  .eq(e + 3 * t)
                  .removeClass("opacity-100")
                  .addClass("opacity-0");
      for (var i = 0; i < $(".img-group").length; i++)
          $(".img-group .dimension-group")
              .eq(a + 3 * i)
              .removeClass("opacity-0")
              .addClass("opacity-100");
      setTimeout(() => {
          s();
      }, 1500);
  }
  var l = {
      img: [
          "css/assets/img/maze/maze1.png",
          "css/assets/img/maze/maze2.png",
          "css/assets/img/maze/maze3.png",
          "css/assets/img/maze/maze4.png",
          "css/assets/img/maze/maze5.png",
          "css/assets/img/maze/maze6.png",
          "css/assets/img/maze/maze7.png",
          "css/assets/img/maze/maze8.png",
          "css/assets/img/maze/maze9.png",
          "css/assets/img/maze/maze10.png",
          "css/assets/img/maze/maze11.png",
      ],
      id: ["#1", "#2", "#3", "#4", "#5", "#6", "#7", "#8", "#9", "#10", "#11"],
      title: ["Square Maze", "Triangle Maze", "Hexagonal Maze", "Diamond Maze", "SquareTriangles Maze", "SnubSquare Maze", "SnubSquare2 Maze", "Cairo Maze", "Round Maze", "Penrose-Sun Maze", "Penrose-Star Maze"],
  };
  setTimeout(function e() {
      11 == o && (o = 0);
      $("#game-img").attr("src", l.img[o]),
          $("#game-id").text(l.id[o]),
          setTimeout(() => {
              $("#game-cnt").removeClass("left-0").addClass("left-1/2"), $("#game-id").removeClass("opacity-0 rotate-x-180").addClass("opacity-1 rotate-x-0");
          }, 125),
          setTimeout(() => {
              $("#game-img").removeClass("opacity-0").addClass("opacity-1");
          }, 250);
      for (var t = 0; t < l.title[o].length; t++)
          " " == l.title[o][t]
              ? $("#game-title").append('<span class="xl1:mx-2 lg1:mx-1.5 md1:mx-1 mx-0.5"></span>')
              : t % 2 != 0
              ? ($("#game-title").append(`<span class="xl1:mx-1 lg1:mx-0.75 md1:mx-0.5 mx-0.25 opacity-0 rotate-y-180 transition-c duration-500 even-spans">${l.title[o][t]}</span>`),
                setTimeout(() => {
                    $(".even-spans").removeClass("opacity-0 rotate-y-180").addClass("opacity-1 rotate-y-0");
                }, 750))
              : ($("#game-title").append(`<span class="xl1:mx-1 lg1:mx-0.75 md1:mx-0.5 mx-0.25 opacity-0 transition-opacity duration-500 odd-spans">${l.title[o][t]}</span>`),
                setTimeout(() => {
                    $(".odd-spans").removeClass("opacity-0").addClass("opacity-1");
                }, 1125));
      setTimeout(() => {
          $(".odd-spans").removeClass("opacity-1").addClass("opacity-0");
      }, 3125),
          setTimeout(() => {
              $(".even-spans").removeClass("opacity-1 rotate-y-0").addClass("opacity-0 rotate-y-180");
          }, 3500),
          setTimeout(() => {
              $("#game-img").removeClass("opacity-1").addClass("opacity-0");
          }, 4e3),
          setTimeout(() => {
              $("#game-cnt").removeClass("left-1/2").addClass("left-full"),
                  setTimeout(() => {
                      $("#game-cnt").removeClass("left-full").addClass("left-0");
                  }, 500),
                  $("#game-id").removeClass("opacity-1 rotate-x-0").addClass("opacity-0 rotate-x-180"),
                  $("#game-title").empty();
          }, 4125),
          setTimeout(e, 5125),
          o++;
  }, 0);
  var o = 0;
  $("#func").css({ left: `${$("#func-parent").outerWidth()}px` }),
      setInterval(() => {
          $("#func").length &&
              (Math.abs(
                  parseInt(
                      $("#func")
                          .css("left")
                          .substring(0, $("#func").css("left").length - 2)
                  )
              ) >= $("#func").outerWidth() && $("#func").css({ left: `${$("#func-parent").outerWidth()}px` }),
              $("#func").css({
                  left:
                      parseInt(
                          $("#func")
                              .css("left")
                              .substring(0, $("#func").css("left").length - 2)
                      ) -
                      1 +
                      "px",
              }));
      }, 10),
      $("#go-button").click(function () {
          document.querySelectorAll("#svg-container")[0].getBoundingClientRect().height > $(window).height()
              ? $("#svg-container").addClass("absolute left-1/2 top-0 -translate-50-0")
              : $("#svg-container").removeClass("absolute left-1/2 top-0 -translate-50-0");
      });
});
