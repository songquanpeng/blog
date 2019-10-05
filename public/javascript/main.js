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

function loadMessages() {
    $.get("/api/message", function (data) {
        const tableBody = $("#messageTable tbody");
        tableBody.empty();
        let result = "";
        data.forEach(function (item) {
            result += "<tr id='message_" + item.id + "'><td>" + item.title + "</td><td>" + item.time + "</td><td>" + item.content + `</td><td><button class='btn btn-sm btn-outline-warning' onclick="deactivateMessage(` + item.id + `)">Make as read</button></td></tr>`;
        });
        tableBody.append(result);
    });
}

function deactivateMessage(id) {
    $.ajax({
        url: '/api/deactivateMessage/'+id,
        type: 'DELETE',
        success: function(result) {
            $("#message_" + id).remove();
        }
    });
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


function onTimeTagClicked(time) {
    const date = time.split(",")[0];
    window.location.href = "/date/" + date.split("/")[2] + "-" + date.split("/")[0];
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

function submitArticle() {

}

$(document).ready(function(){
    $('[data-toggle="tooltip"]').tooltip();
});
