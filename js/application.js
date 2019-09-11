// our application constructor
function application () {
}

/* сохраняем текущую ширину фрейма */
application.prototype.saveFrameWidth = function () {
    this.FrameWidth = document.getElementById("app").offsetWidth;
}

/* изменяем размер фрейма */
application.prototype.resizeFrame = function () {

    var currentSize = BX24.getScrollSize();
    minHeight = currentSize.scrollHeight;

    if (minHeight < 400) minHeight = 1800;
    BX24.resizeWindow(this.FrameWidth, minHeight);
}

/* Выбор пользователя */
application.prototype.addSelectUser = function() {
    BX24.selectUser(function(users) {
        idUser = users.id;
        $('#btn_manager').html(users.name);
    });
}

/* Получение список направлений сделок */
application.prototype.dealСategory = function(){
    var idDealCategory = [], dealCategory = [];

    BX24.callMethod(
        "crm.dealcategory.list",
        {
            order: { "SORT": "ASC" },
            filter: { "IS_LOCKED": "N" },
            select: [ "ID", "NAME"]
        },
        function(result){
            if(result.error())
                console.error(result.error());
            else
            {
                var data = result.data();

                for (indexDealCategory in data) {
                    dealCategory.push({ID: data[indexDealCategory].ID, NAME: data[indexDealCategory].NAME});
                    idDealCategory.push(data[indexDealCategory].ID);
                }

                if(result.more())
                    result.next();
                else
                    app.importDealCategory(idDealCategory, dealCategory);
            }
        }
    );
}

/* Получение стадий сделки */
application.prototype.importDealCategory = function(idCategory, dealCategory){
    var arCommands = {};

    for (indexDealCategory in idCategory)
        arCommands[indexDealCategory] = {
            method: 'crm.dealcategory.stage.list',
            params: {
                ID: idCategory[indexDealCategory]
            }
        };

    BX24.callBatch(
        arCommands,
        function(result)
        {
            for (indexCategory in result){
                data = result[indexCategory].answer.result;

                for (indexStage in data){
                    arDealStage[data[indexStage].STATUS_ID] = {CATEGORY:dealCategory[indexCategory].NAME, NAME: data[indexStage].NAME}
                }
            }
            console.log("Результат");
            console.log(arDealStage);
        }
    );
}

/* Получение списка задачь по менаджеру */
application.prototype.userTaskList = function (dataStart, dataEnd) {
    var curapp = this;

    BX24.callMethod(
        "tasks.task.list",{
            filter:{                                    // Фильтр
                'RESPONSIBLE_ID': idUser,                       // ИД пользователя 7784
                'GROUP_ID': 104,                                // ИД группы     (104- Тех отдел)
                'STATUS': [4,5],                                // Статус задачи (5 - закрыта)
                '<CLOSED_DATE': dataEnd,    // Промежуто времени закрытия задачи
                '>CLOSED_DATE': dataStart},
            select: [
                'ID','TITLE','STATUS','CLOSED_DATE','CREATED_BY','UF_CRM_TASK', 'CREATED_DATE' ],
            order:{}},
        function(result)
        {
            if (result.error()) {
                curapp.displayErrorMessage('К сожалению, произошла ошибка получения сделок. Попробуйте повторить отчет позже');
                console.error(result.error());
            }
            else{
                var data = result.data();
                data = data['tasks'];
                var idDeal = 0;

                for (indexTask in data) {
                    arrAllData.push({
                        ID: data[indexTask].id,
                        TITLE: data[indexTask].title,
                        STATUS: data[indexTask].status,
                        CLOSED_DATE: data[indexTask].closedDate,
                        CREATED_BY: data[indexTask].createdBy,
                        UF_CRM_TASK: data[indexTask].ufCrmTask[0].substr(2,data[indexTask].ufCrmTask[0].length),
                        CREATED_DATE: data[indexTask].createdDate,
                        CREATOR: data[indexTask].creator
                    });

                    idDeal = data[indexTask].ufCrmTask[0].substr(2,data[indexTask].ufCrmTask[0].length);
                    if (idTasks.indexOf(idDeal) == -1) // Если сделка еще нет в массиве
                        idTasks.push(idDeal);
                }
                if (result.more())
                    result.next();
                else {
                    htmlSumTasks = "<table class='itog' style='height: 87px; width: 462px; border-style: solid;'><thead><tr style='height: 18px;'>" +
                                   "<td style='width: 332px; height: 18px;'>ВСЕГО ВЫПОЛНЕНО:</td>" +
                                   "<td style='width: 123px; height: 18px; color: #c82828; text-align: center;'><strong>" +
                                    arrAllData.length + "</strong></td></tr>" +
                                   "<tr style='height: 18px;'><td colspan='2' style='width: 458px; height: 18px; text-align: center;'>Сделки&nbsp;</td>" +
                                   "</tr></thead><tbody>";

                    console.log('1. Задачи');
                    console.log(arrAllData);
                    console.log(idTasks);
                    //curapp.displayData();
                    app.tasksDeals(idTasks, dataStart, dataEnd);
                }
            }
        }
    );
}

/*Формируем таблицу HTML по данным сделки*/
application.prototype.generationTable = function (color, ID, TITLE, OPPORTUNITY, creater, STAGE_ID) {
    var txtHTML = '';
    var colorSUM = '<b>' + String(OPPORTUNITY).replace(/(\d)(?=(\d\d\d)+([^\d]|$))/g, '$1 ') + '</b>';

    if (OPPORTUNITY == null || OPPORTUNITY == '0.00')
        OPPORTUNITY = 0;

    if (OPPORTUNITY <= 0)
        if (color == "table-success")
            colorSUM = '<b class="text-danger area">' + OPPORTUNITY + '</b>';
        else
            colorSUM = '<b class="text-danger"><h4>' + OPPORTUNITY + '</h4></b>';

    txtHTML = '<tr class=' + color + '>' +
                '<td rowspan="2" width="80">'+
                '<img src="' + creater.icon + '" alt="' + creater.name + '"/></td>' +
                '<td colspan="3">' +
                '<a href="' + urlPortal + 'crm/deal/details/' + ID + '/" target="_blank" rel="noopener" title="Открыть сделку">'+
                '[ ' + ID + ' ] <b>' + TITLE + '</b></a></td></tr>' +
              '<tr class=' + color + '><td><a href="' + urlPortal + creater.link + '" target="_blank" rel="noopener">' + creater.name + '</a></td>' +
                  '<td>' + arDealStage[STAGE_ID].CATEGORY + '<br><b>' + arDealStage[STAGE_ID].NAME + '</b></td>' +
                  '<td>' +  colorSUM + '</td>' +
              '</tr>';

    return txtHTML;
}

/* Количество задачь по данной сделке */
application.prototype.dealsInTask = function (idTask) {
    var intDeal = 0;
    for (indexD in arrAllData)
        if (arrAllData[indexD].UF_CRM_TASK == idTask)
            intDeal += 1;

    return intDeal;
}

/* Получение Сделок по ИД */
application.prototype.tasksDeals = function (idTasks, dataStart, dataEnd) {
    var curapp = this;
    var sumDealVictory = 0, dealVictory = 0, dealVictoryTask = 0;
    var dealLose = 0, dealLoseTask = 0;
    var dealWork = 0, dealWorkTask = 0;
    var dealNew = 0, dealNewTask = 0;
    var htmlDealWork = '', htmlDealVictory = '', htmlDealLose = '', htmlSumTasks = '';
    var creater = [];

    BX24.callMethod(
        "crm.deal.list",{
            order: { "DATE_CREATE": "ASC" },
            filter: { "ID": idTasks },            // Напровление сделки
            select: [ "ID", "COMPANY_ID", "TITLE", "CLOSEDATE", "CLOSED", "STAGE_ID", "OPPORTUNITY", "DATE_CREATE"]
        },
        function(result)
        {
            if (result.error()) {
                curapp.displayErrorMessage('К сожалению, произошла ошибка получения сделок. Попробуйте повторить отчет позже');
                console.error(result.error());
            }
            else{
                var data = result.data();

                for (indexDeal in data) {
                    for (indexTask in arrAllData) {
                        if (arrAllData[indexTask].UF_CRM_TASK == data[indexDeal].ID)
                            creater = arrAllData[indexTask].CREATOR;
                    }

                    var dateCreateDeal = new Date(data[indexDeal].DATE_CREATE);
                    if (dateCreateDeal.getMonth() >= dataStart.getMonth() && dateCreateDeal.getMonth() <= dataEnd.getMonth())
                        dealNew += 1;

                    if (data[indexDeal].CLOSED == 'N'){
                        dealWork += 1;
                        dealWorkTask += curapp.dealsInTask(data[indexDeal].ID); // Сколько Задачь к данной сделке прикреплено
                        htmlDealWork += curapp.generationTable("table-warning", data[indexDeal].ID, data[indexDeal].TITLE, data[indexDeal].OPPORTUNITY, creater, data[indexDeal].STAGE_ID);

                    }else{
                        if(data[indexDeal].STAGE_ID.substr(4,3)=='WON'){
                            dealVictory += 1;
                            dealVictoryTask += curapp.dealsInTask(data[indexDeal].ID);
                            sumDealVictory += parseFloat(data[indexDeal].OPPORTUNITY);
                            htmlDealVictory += curapp.generationTable("table-success", data[indexDeal].ID, data[indexDeal].TITLE, data[indexDeal].OPPORTUNITY, creater, data[indexDeal].STAGE_ID);

                            console.log(data[indexDeal]);
                        }else{
                            dealLose += 1;
                            dealLoseTask += curapp.dealsInTask(data[indexDeal].ID);
                            htmlDealLose += curapp.generationTable("table-danger", data[indexDeal].ID, data[indexDeal].TITLE, data[indexDeal].OPPORTUNITY, creater, data[indexDeal].STAGE_ID);
                        }
                    }
                }

                if (result.more())
                    result.next();
                else {

                    for(indexTS in arrAllData) {
                        var dateCreateTask = new Date(arrAllData[indexTS].CREATED_DATE);
                        if (dateCreateTask.getMonth() >= dataStart.getMonth() && dateCreateTask.getMonth() <= dataEnd.getMonth())
                            dealNewTask += 1;
                    }

                    htmlSumTasks += "<tr><td></td><td>Задачи</td><td>Сделки</td></tr>"+
                                    "<tr style='height: 18px;'><td style='text-align: left; width: 332px; background-color: #b0e0e6; height: 18px;'>Новые</td>" +
                                    "<td style='width: 123px; background-color: #b0e0e6; height: 18px; text-align: center;'><strong>" +
                                    dealNewTask + "</strong></td>" +
                                    "<td style='width: 123px; background-color: #b0e0e6; height: 18px; text-align: center;'><strong>" +
                                    dealNew + "</strong></td></tr>" +
                                    "<tr class='spacer'><td></td><td></td><td></td></tr>" +
                                    "<tr style='height: 18px;'><td style='text-align: left; width: 332px; background-color: #ffeeba; height: 18px;'>В работе</td>" +
                                    "<td style='width: 123px; background-color: #ffeeba; height: 18px; text-align: center;'><strong>" +
                                    dealWorkTask + "</strong></td>" +
                                    "<td style='width: 123px; background-color: #ffeeba; height: 18px; text-align: center;'><strong>" +
                                    dealWork + "</strong></td></tr>" +
                                    "<tr style='height: 15px;'><td style='text-align: left; width: 332px; background-color: #f08080; height: 15px;'>Проигранно</td>" +
                                    "<td style='width: 123px; background-color: #f08080; height: 15px; text-align: center;'><strong>" +
                                    dealLose + "</strong></td>" +
                                    "<td style='width: 123px; background-color: #f08080; height: 15px; text-align: center;'><strong>" +
                                    dealLoseTask + "</strong></td></tr>" +
                                    "<tr style='height: 18px;'><td style='text-align: left; width: 332px; background-color: #98FB98; height: 18px;'>Завершено положительно</td>" +
                                    "<td style='width: 123px; background-color: #98FB98; height: 18px; text-align: center;'><strong>" +
                                    dealVictory + "</strong></td>" +
                                    "<td style='width: 123px; background-color: #98FB98; height: 18px; text-align: center;'><strong>" +
                                    dealVictoryTask + "</strong></td></tr>" +
                                    "<tr class='spacer'><td></td><td></td><td></td></tr>"+
                                    "<tr></tr><tr style='height: 18px;'><td style='text-align: left; width: 332px; background-color: #98F00F; height: 18px;'>Сумма выиграных сделок:</td>" +
                                    "<td style='width: 123px; background-color: #98F00F; height: 18px; text-align: center;'><strong>" +
                                    String(sumDealVictory.toFixed(2)).replace(/(\d)(?=(\d\d\d)+([^\d]|$))/g, '$1 ') + "</strong></td></tr></tbody></table>"

                    $('#sum-tasks').html(htmlSumTasks);
                    $('#table-deals').html('<table class="table table-bordered table-hover">' +
                                            htmlDealWork +
                                            htmlDealLose +
                                            htmlDealVictory +
                                            '</table>');

                    curapp.resizeFrame();       // изменение размера окна

                    //console.log('2.1 Сделок в работе');
                    //console.log(dataStart, dataEnd);
                    //console.log(dataStart, dataEnd);
                    //console.log('2.2 Сделок выигрно');
                    //console.log(dealVictory);
                    //console.log(sumDealVictory);
                    //console.log('2.3 Сделок проиграно');
                    //console.log(dealLose);
                }
            }
        }
    );
}

/* Нажатие кнопки сформировать */
application.prototype.runGeneration = function(){
    var curapp = this;

    if (idUser == 1 || month_input.value.length == 0){
        $('#alert-warning').html('<div class="alert alert-warning" role="alert">Выберите сотрудника и месяц  !!!</div>');
    } else {
        $('#alert-warning').html('');
        $('#sum-tasks').html('');
        $('#table-deals').html('');
        arrAllData = [];
        idTasks = [];



        curapp.userTaskList(new Date(month_input.value), new Date(month_input.value.substr(0,5) + (parseInt(month_input.value.substr(5,2)) + 1)));
    }



}

// create our application
app = new application();

var arrAllData = [], idTasks = [];
var urlPortal = 'https://corp.amper.by/';
var idUser = 1;

var arDealStage = {}; // Стадии Сделок ВСЕ!