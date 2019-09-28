const colorsList = [
    'w3-red', 'w3-pink', 'w3-purple',
    'w3-deep-purple', 'w3-indigo', 'w3-blue',
    'w3-aqua', 'w3-green', 'w3-orange',
    'w3-amber', 'w3-blue-gray', 'w3-dark-gray',
];

function deleteArticle(id) {
    if (confirm("This article will be deleted soon")) {
        $.ajax({
            url: "/api/article/" + id,
            type: 'DELETE',
            success: function (result) {
                document.getElementById("article_" + id).style.display = "none";
                //alert(result);
            }
        });
    }
}

function deleteFile(name) {
    if (confirm("This file will be deleted soon")) {
        $.ajax({
            url: "/api/file/" + name,
            type: 'DELETE',
            success: function (result) {
                document.getElementById("file_" + name).style.display = "none";
            }
        });
    }
}


function deleteUser(name) {
    if (confirm("This user will be deleted soon")) {
        $.ajax({
            url: "/api/user/" + name,
            type: 'DELETE',
            success: function (result) {
                document.getElementById("user_" + name).style.display = "none";
                alert(result);
            },
            statusCode: {
                403: function () {
                    document.location.reload();
                }
            }
        });
    }
}

function addUser() {
    const newName = $("#addUserName").val().trim();
    const newPassword = $("#addUserPassword").val().trim();
    if (newName === "" || newPassword === "") {
        alert("Please check your input.");
        return;
    }
    $.ajax({
        url: "/api/addUser",
        type: 'POST',
        data: {"name": newName, "password": newPassword},
        statusCode: {
            403: function () {
                document.location.reload();
            },
            200: function () {
                document.location.reload();
            }
        }
    });
}

function updateMyInfo() {
    const newName = $("#newName").val().trim();
    const newPassword = $("#newPassword").val().trim();
    if (newName === "" || newPassword === "") {
        alert("Please check your input.");
        return;
    }
    $.ajax({
        url: "/api/update_user",
        type: 'POST',
        data: {"name": newName, "password": newPassword},
        statusCode: {
            403: function () {
                document.location.reload();
            },
            200: function () {
                document.location.reload();
            }
        }
    });
}

function addNewMessage(message) {
    const newListItem = '<li class="w3-bar"> <div> <span class="w3-tag random-color">' + message.author +
        '</span> <span class="w3-opacity">' + message.time +
        '</span> <p class="w3-serif w3-large">' + message.content +
        '</p> </div></li>';
    $("#messageUl").append(newListItem);
    document.getElementById("messageDiv").scrollTop = document.getElementById("messageDiv").scrollHeight;
}

var lastVideoPath = "";

function openVideo(videoPath) {
    videoPath = "public/videos/show/" + videoPath;
    if (videoPath === lastVideoPath) {
        if ($("#videoPlayer")[0].paused) {
            $("#videoPlayer")[0].play();
        } else {
            $("#videoPlayer")[0].pause();
        }
    } else {
        $("#videoSource").attr('src', videoPath);
        $("#videoPlayer")[0].load();
        $("#videoPlayer")[0].play();
        $("#videoDescription").text(videoPath);  // TODO: Video description and comment
        lastVideoPath = videoPath;
    }
}

function randomColor() {
    $('.random-color').each(function (index, tag) {
        const selectedColor = colorsList[Math.floor((Math.random() * colorsList.length))];
        $(tag).addClass(selectedColor);
    });
}


function onTimeTagClicked(time) {
    const date = time.split(",")[0];
    window.location.href = "/date/" + date.split("/")[2] + "-" + date.split("/")[0];
}

$(document).ready(function () {
    randomColor();
});

function submitComment(path) {
    const content = $('#comment-input').val();
    if (content === "") {
        $('#comment-input').focus();
    } else {
        $.ajax({
            url: path,
            type: 'POST',
            data: {"content": content},
            statusCode: {
                403: function () {
                    document.location.href = "/user"
                },
                200: function () {
                    document.location.reload();
                }
            }
        });
    }
}

$(document).ready(
    function () {
        $("#messageBox").keydown(function (event) {
            if (event.keyCode === 13) {
                const content = $("#messageBox").val().trim();
                if (content !== "") {
                    $.ajax({
                        url: "/api/chat",
                        type: 'POST',
                        data: {"content": content},
                        statusCode: {
                            500: function () {
                                document.location.reload();
                            },
                            200: function () {
                                document.location.reload();
                            }
                        }
                    });
                } else {
                    document.location.reload();
                }
            }
        })
    }
);
