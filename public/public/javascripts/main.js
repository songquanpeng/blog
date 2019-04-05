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
            url: "/api/user/"+name,
            type: 'DELETE',
            success: function (result) {
                document.getElementById("user_" + name).style.display = "none";
                alert(result);
            }
        });
    }
}

function updateMyInfo(){
    const newName = $("#newName").val().trim();
    const newPassword = $("#newPassword").val().trim();
    if(newName=="" || newPassword==""){
        alert("Please check your input.")
        return;
    }
    $.ajax({
        url: "/api/update_user",
        type: 'POST',
        data:{"name":newName, "password":newPassword},
        success: function (result) {
            alert(result);
        }
    });
}