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
                alert(result);
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
            }
        });
    }
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
        success: function (result) {
            alert(result);
        }
    });
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
    const date = time.split(" ")[0];
    window.location.href = "/date/" + date;
}

$(document).ready(function () {
    randomColor();
});

function submitComment(path) {
    const content = $('#comment-input').val();
    $.post(path, {
        content: content,
        path: path
    }, function (data, status) {
        document.location.reload();
    });
}