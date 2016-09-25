'use strict';

angular.module('classBrowserUHApp.class', ['ngRoute']).
config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/class', {
        templateUrl: 'views/class/class.html',
        controller: 'ClassCtrl'
    });
}]).
controller('ClassCtrl', ['$scope', '$http', '$q', '$rootScope', '$parse', function ($scope, $http, $q, $rootScope, $parse) {
    $scope.rowCollection = [];

    var setScopeVariableFromJSON = function(filePath, scopeVariable) {
        $rootScope.httpService.getData(filePath).then(function(result) {
            $parse(scopeVariable).assign($scope, result);
        });
    };

    var initializeAllJSONAndScopeNames = function(name) {
        $rootScope.httpService.getData('resources/allScopeVariables.json').then(function(result) {
            $scope.allJSONAndScopeNames = result[name];
            $scope.allJSONAndScopeNames.forEach(function(e) {
                setScopeVariableFromJSON(e.path, e.scopeName);
            });
        });
    };

    initializeAllJSONAndScopeNames("class");

    var generateMessage = function(model, type, objToPluck) {
        if(model == undefined || model.length == 0) {
            return "";
        }
        else {
            return "<b> " + type + "</b>: " + _.pluck(model, objToPluck).join(', ') + "<br>";
        }
    };


    $scope.populateClasses = function(){
        $scope.isDataLoading = true;
        $scope.isError = false;
        $scope.hasNoResults = false;
        $scope.rowCollection = [];
        $scope.numberOfRows = 0;

        var apiURLs = buildApiUrlsFromModel($scope.departmentModel, $scope.creditHourModel, $scope.coreModel);

        _.each(apiURLs, function(apiURL) {
                $rootScope.httpService.getData(apiURL)
                    .then(appendResults)
                    .then(populateFields)
                    .catch(onError)
                    .then(finallyDo)
            }
        );
    };

    var appendResults = function(result) {
        $scope.numberOfRows += result.numberOfRows;
        $scope.rowCollection = $scope.rowCollection.concat(result.result);
    };

    var onError = function(err) {
        $scope.isError = true;
        $scope.errorMessage = "Unable to populate classes for the class directory. Please try again later.";
    };

    var finallyDo = function() {
        $scope.isDataLoading = false;
        if($scope.rowCollection.length == 0) {
            $scope.hasNoResults = true;
            $scope.warningMessage = "There are no classes found with the categories you have specified. Please try again.";
        }
    };

    var populateFields = function(){
        if($scope.rowCollection.length > 0) {
            $scope.showResults = true;
            $scope.hasNoResults = false;

            $scope.numberOfRowsMessage = "Retrieved " + $scope.numberOfRows + " class";
            $scope.numberOfRowsMessage += $scope.numberOfRows == 1 ? "." : "es.";

            if ([$scope.departmentModel, $scope.creditHourModel, $scope.coreModel].allParametersUndefinedOrNull()) {
                $scope.parametersMessage = "No parameters were chosen, so all classes have been retrieved.";
            }
            else {
                $scope.subjectMessage = generateMessage($scope.departmentModel, 'Subjects', 'departmentFullName');
                $scope.creditHoursMessage = generateMessage($scope.creditHourModel, 'Credit Hours', 'creditHours');
                $scope.coreMessage = generateMessage($scope.coreModel, 'Core Categories', 'categoryName');
                $scope.parametersMessage = $scope.subjectMessage +
                    $scope.creditHoursMessage +
                    $scope.coreMessage;
            }
        }
    };


    var buildApiUrlsFromModel = function(department, creditHour, core) {
        console.log("Building API URL...");
        var baseUrl = $scope.apiUrl + '/information?';
        var allParametersFromScope = [
            {
                model: department,
                parameterToPluck: 'departmentName',
                apiParameter: 'department'
            },
            {
                model: creditHour,
                parameterToPluck: 'creditHours',
                apiParameter: 'credit-hours'
            },
            {
                model: core,
                parameterToPluck: 'categoryNumber',
                apiParameter: 'core'
            }
        ];

        var areAllParametersUndefinedOrNull = function(parameters) {
            parameters.forEach(function(e) {
                if($rootScope.arrayService.isArrayIsNotUndefinedOrNull(e.model)) {
                    console.log("model: " + e.model);
                    return false;
                }
            });
            return true;
        };

        if(areAllParametersUndefinedOrNull(allParametersFromScope)) {
            console.log("No parameters");
            return [baseUrl];
        }


        allParametersFromScope.forEach(function(part, index, allParametersFromScope) {
            console.log(_.pluck(part.model, part.parameterToPluck));
            allParametersFromScope[index] = _.pluck(part.model, part.parameterToPluck);
        });

        // department = _.pluck(department, 'departmentName');
        // creditHour = _.pluck(creditHour, 'creditHours');
        // core = _.pluck(core, 'categoryNumber');

        if($rootScope.arrayService.isArrayIsNotUndefinedOrNull(department)) {
            $rootScope.apiURLService.expandArrayValuesInPlace(department, 'department');
        }
        if($rootScope.arrayService.isArrayIsNotUndefinedOrNull(creditHour)) {
            $rootScope.apiURLService.expandArrayValuesInPlace(creditHour, 'credit-hours');
        }
        if($rootScope.arrayService.isArrayIsNotUndefinedOrNull(core)) {
            $rootScope.apiURLService.expandArrayValuesInPlace(core, 'core');
        }

        var allParameters = [department,creditHour,core]
            .filter($rootScope.cartesianProductService.nonEmpty)
            .reduce($rootScope.cartesianProductService.productAdd);

        $rootScope.apiURLService.appendParametersToAPIUrl(allParameters, baseUrl);

        return allParameters;
    };

    var deleteModel = function() {
        [].slice.call(arguments).forEach(function(arg) {
            delete $scope[arg];
        });
    };

    $scope.goBack = function() {
        console.log('Going back to class search page.');
        deleteModel('hasNoResults', 'isError', 'isDataLoading', 'showResults');
    };

    $scope.clearForms = function() {
        deleteModel('departmentModel', 'creditHourModel', 'coreModel',
            'parametersMessage', 'rowCollection', 'hasNoResults', 'isError',
            'isDataLoading');
    };

}]);