const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};
//Global
var lc = new RTCPeerConnection(servers);
var dc = lc.createDataChannel("channel");

var ls, rs;

var call = () => {
  document.getElementById("loadPuropuse").style.display = "flex";
  document.getElementById("upDiv").style.display = "none";
  document.getElementById("recDiv").style.display = "none";
  document.getElementById("TXTarea").value = "Generating ID..";

  (async function x() {
    var docRef = await db.collection("users").add({
      date: new Date(),
    });

    document.getElementById("TXTarea").value = docRef.id;

    var updateId = db.collection("users").doc(docRef.id);

    ls = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    rs = new MediaStream();

    ls.getTracks().forEach((track) => {
      lc.addTrack(track, ls);
    });

    lc.ontrack = (e) => {
      e.streams[0].getTracks().forEach((track) => {
        rs.addTrack(track);
      });
    };

    document.getElementById("localVideo").srcObject = ls;
    document.getElementById("remoteVideo").srcObject = rs;

    var offerCan = `${docRef.id}OfrCandi`;
    lc.onicecandidate = (e) => {
      if (e.candidate != null) {
        db.collection(offerCan).add(e.candidate.toJSON());
      }
    };

    lc.createOffer().then((o) => {
      lc.setLocalDescription(o);

      (async () => {
        var btn = document.createElement("BUTTON");
        var t = document.createTextNode("Copy");

        btn.appendChild(t);
        document.getElementById("wrapP").appendChild(btn);
        document
          .querySelector("#wrapP button")
          .setAttribute("onclick", "copyText()");
        document
          .querySelector("#wrapP button")
          .setAttribute("id", "copyTextBTn1");

        updateId.update({
          id: docRef.id,
          callSDP: JSON.stringify(o),
        });

        var cn1 = 0;
        var trySnapshot = await db
          .collection("users")
          .where("id", "==", docRef.id);

        trySnapshot.onSnapshot((snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
              if (change.doc.data().receiveSDP != "" && cn1 < 1) {
                cn1++;
                var answer = JSON.parse(change.doc.data().receiveSDP);

                lc.setRemoteDescription(new RTCSessionDescription(answer));
              }
            }
          });
        });
      })();
    });

    (async () => {
      var answerCan = `${docRef.id}AnsCandi`;
      var trySnapshot12 = await db.collection(answerCan);

      trySnapshot12.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            var answerCandidate = change.doc.data();
            const candidate = new RTCIceCandidate(answerCandidate);

            lc.addIceCandidate(candidate);
          }
        });
      });
    })();

    document.getElementById("localVideo").muted = true;
    document.getElementById("loadPuropuse").style.display = "none";
    setTimeout(() => {
      $("#copyTextBTn1").addClass("animate__animated animate__shakeX");
    }, 10);
  })();
};

var receive = () => {
  document.getElementById("upDiv").style.display = "none";
  document.getElementById("TXTareaDiv").style.display = "none";
};

var rec = () => {
  document.getElementById("loadPuropuse").style.display = "flex";
  var valOfSnder = document.getElementById("recTXT").value;

  if (valOfSnder != "") {
    (async () => {
      var data = await db
        .collection("users")
        .where("id", "==", valOfSnder.trim())
        .get();

      data.docs.forEach((doc) => {
        var offer = JSON.parse(doc.data().callSDP);

        (async function x() {
          var ls = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          var rs = new MediaStream();

          ls.getTracks().forEach((track) => {
            lc.addTrack(track, ls);
          });

          lc.ontrack = (e) => {
            e.streams[0].getTracks().forEach((track) => {
              rs.addTrack(track);
            });
          };

          document.getElementById("localVideo").srcObject = ls;
          document.getElementById("remoteVideo").srcObject = rs;

          var answerCan = `${valOfSnder}AnsCandi`;
          lc.onicecandidate = (e) => {
            if (e.candidate != null) {
              db.collection(answerCan).add(e.candidate.toJSON());
            }
          };

          lc.setRemoteDescription(new RTCSessionDescription(offer));

          lc.createAnswer().then((a) => {
            lc.setLocalDescription(a);

            (async () => {
              var updateId = db.collection("users").doc(valOfSnder.trim());

              updateId.update({
                receiveSDP: JSON.stringify(a),
              });
            })();
          });

          (async () => {
            var offerCan = `${valOfSnder}OfrCandi`;
            var trySnapshot1 = await db.collection(offerCan);

            trySnapshot1.onSnapshot((snapshot) => {
              snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                  var offerCandidate = change.doc.data();
                  const candidate = new RTCIceCandidate(offerCandidate);

                  lc.addIceCandidate(candidate);
                }
              });
            });
          })();

          document.getElementById("localVideo").muted = true;
          document.getElementById("loadPuropuse").style.display = "none";
        })();
      });
    })();
  }
};

var copyText = () => {
  var copyText = document.getElementById("TXTarea");
  copyText.select();

  document.execCommand("copy");
  $("#copyTextBTn1").removeClass("animate__animated animate__shakeX");
  $("#copyTextBTn1").removeClass("animate__animated animate__rubberBand");
  setTimeout(() => {
    $("#copyTextBTn1").addClass("animate__animated animate__rubberBand");
  }, 10);
};

dc.onopen = (e) => {
  document.getElementById("recDiv").style.display = "none";
  document.getElementById("TXTareaDiv").style.display = "none";
  document.querySelector("#chatBox div:nth-child(2)").style.display = "flex";
};
