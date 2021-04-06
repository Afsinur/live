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

    var arrayCandidates = [];
    lc.onicecandidate = (e) => {
      if (e.candidate) {
        arrayCandidates.push(e.candidate.toJSON());
      } else if (e.candidate == null) {
        updateId.update({
          offerCandidates: arrayCandidates,
        });
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

        updateId.update({
          id: docRef.id,
          callSDP: JSON.stringify(o),
        });

        var trySnapshot = await db
          .collection("users")
          .where("id", "==", docRef.id);

        trySnapshot.onSnapshot((snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "modified") {
              if (change.doc.data().receiveSDP != null) {
                var answer = JSON.parse(change.doc.data().receiveSDP);

                lc.setRemoteDescription(new RTCSessionDescription(answer));
              }
            }
          });
        });
      })();
    });

    (async () => {
      var trySnapshot12 = await db
        .collection("users")
        .where("id", "==", docRef.id);

      trySnapshot12.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "modified") {
            if (change.doc.data().answerCandidates != null) {
              change.doc.data().answerCandidates.forEach((answerCandidate) => {
                var candidate = new RTCIceCandidate(answerCandidate);
                lc.addIceCandidate(candidate);
              });
            }
          }
        });
      });
    })();

    document.getElementById("localVideo").muted = true;
    document.getElementById("loadPuropuse").style.display = "none";
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

          var updateId = db.collection("users").doc(valOfSnder);

          var arrayCandidates = [];
          lc.onicecandidate = (e) => {
            if (e.candidate) {
              arrayCandidates.push(e.candidate.toJSON());
            } else if (e.candidate == null) {
              updateId.update({
                answerCandidates: arrayCandidates,
              });
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
            var trySnapshot1 = await db
              .collection("users")
              .where("id", "==", valOfSnder);

            trySnapshot1.onSnapshot((snapshot) => {
              snapshot.docChanges().forEach((change) => {
                if (change.type === "modified") {
                  if (change.doc.data().offerCandidates != null) {
                    change.doc
                      .data()
                      .offerCandidates.forEach((offerCandidate) => {
                        var candidate = new RTCIceCandidate(offerCandidate);
                        lc.addIceCandidate(candidate);
                      });
                  }
                }
              });
            });
          })();

          document.getElementById("localVideo").muted = true;
          document.getElementById("loadPuropuse").style.display = "none";
        })();
      });

      document.getElementById("localVideo").srcObject = ls;
      document.getElementById("remoteVideo").srcObject = rs;
    })();
  }
};

var copyText = () => {
  var copyText = document.getElementById("TXTarea");
  copyText.select();

  document.execCommand("copy");
  alert("ID Copied!");
};

dc.onopen = (e) => {
  document.getElementById("recDiv").style.display = "none";
  document.getElementById("TXTareaDiv").style.display = "none";
  document.querySelector("#chatBox div:nth-child(2)").style.display = "flex";
};
