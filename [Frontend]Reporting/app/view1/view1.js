'use strict';

angular.module('myApp.view1', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/view1', {
    templateUrl: 'view1/view1.html',
    controller: 'View1Ctrl'
  });
}])

.controller('View1Ctrl', function($http, $scope, $sce, $filter) {
  $scope.category_name_mapping = {
    0: "Cluster Map",
    1: "Heat Maps"
  };

  $scope.reset = function(){
    $scope.category = null;
    $scope.startDate = null;
    $scope.init_end_date();
  }

  $scope.init_end_date = function(){
    $scope.endDate = new Date();
  }

  $scope.set_start_date_to_today = function(){
    $scope.startDate = new Date();
  }

  $scope.set_category = function(category){
    // 0 = cluster map, 1 = heat map
    $scope.category = category;
  }

  $scope.get_folly = function(category, startDate, endDate){
    startDate = $filter('date')(startDate, 'yyyy-MM-dd')
    endDate = $filter('date')(endDate, 'yyyy-MM-dd')
    console.log("Get Folly inputs. category=" + category + ", start:" + startDate + ", end:" + endDate);
    $scope.detailFrame = $sce.trustAsResourceUrl("http://localhost:8000/folly?category=0&time_st=" + startDate + "&time_end=" + endDate);
    $scope.clusterMap = $sce.trustAsResourceUrl("http://localhost:8000/folly?category=1&time_st=" + startDate + "&time_end=" + endDate);
    // $scope.vectorMap = $sce.trustAsResourceUrl("http://localhost:8000/folly?category=2&time_st=" + startDate + "&time_end=" + endDate);
  }

  $scope.reset();
});