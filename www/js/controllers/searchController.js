angular.module('directory.controllers.searchController', [])
    .controller('searchController', function ($scope, $state, appData, $ionicHistory, $ionicLoading, $ionicScrollDelegate, $cordovaKeyboard, filterService, searchService) {

        var DEFAULT_PAGE_SIZE_STEP = 10;

        $scope.sttButton=false;
        $scope.smrBlock=false;

        $scope.currentPage = 1;
        $scope.pageSize = $scope.currentPage * DEFAULT_PAGE_SIZE_STEP;
        $scope.itemCount = $scope.pageSize;

        $scope.searchKey = "";
        $scope.filter = {};

        $scope.employeeSearchExist = false;
        $scope.keyboardShow = true;

        $scope.noEmployeeFound = false;

        $scope.$on('$ionicView.loaded', function () {
            var filter = $state.params.filter || {};
            if (filter && filter.length) {
                $scope.filter = JSON.parse(filter);
            }
            if (!$scope.searchKey.length) {
                var cachedSearchKey = searchService.getSearchKeyCache();
                if (cachedSearchKey) {
                    $scope.searchKey = cachedSearchKey;
                }
            }
            if ($scope.filter && $scope.searchKey.length) {
                $scope.search();
            }

        });

        $scope.$on('$ionicView.beforeEnter', function () {
          var searchResetState = $state.params.searchreset || false;

          if(searchResetState){
            $scope.clearSearch();
            $state.params.searchreset = false;
          }
        });

        $scope.gotoHome = function() {

          $state.go('searchReset', {searchreset:true}, {reload: true});

        };

        $scope.cacheSearchKey = function () {
            if ($scope.searchKey.length) {
                searchService.setSearchKeyCache($scope.searchKey);
            }
        };

        $scope.clearSearch = function () {

            console.log("clearing search terms");

            $scope.searchKey = null;
            $scope.filter = '';
            $scope.currentPage = 1;
            $scope.pageSize = $scope.currentPage * DEFAULT_PAGE_SIZE_STEP;
            $scope.itemCount = $scope.pageSize;
            $scope.employeeList = null;
            $scope.noEmployeeFound = false;
            $scope.sttButton=false;
            $scope.smrBlock=false;
            $scope.employeeSearchExist = false;

            searchService.removeSearchKeyCache();
            filterService.removeFilterCache();

            // Bug fix for https://jira.inbcu.com/browse/NBCUN-1448
            // need to force the input to rerender in the webview
            // I do this by adding a class, and then adding a transparent styling
            setTimeout(function() {
                document.getElementById("searchForm").classList.add('cleared');
            }, 100);
        };

        $scope.scrollToTop = function () {
          $ionicScrollDelegate.$getByHandle('searchResultScroll').scrollTop(true);
          $scope.sttButton=false;  //hide the button when reached top
        };

        $scope.search = function () {
            $cordovaKeyboard.close();
            $ionicLoading.show();

            searchService.searchByName($scope.searchKey, $scope.filter).then(function (result) {
                $scope.smrBlock = result.length > DEFAULT_PAGE_SIZE_STEP;
                $scope.employeeList = $scope.transform(result);

                $scope.employeeSearchExist = true;

                if($scope.employeeList.length < 1){
                  $scope.noEmployeeFound = true;
                }else{
                  $scope.noEmployeeFound = false;
                }
                $ionicLoading.hide();
            }, function (error) {
                console.log(error);
                $ionicLoading.hide();
            });
        };

        $scope.getFilterURL = function () {
            return $state.href("filter");
        };

        $scope.transform = function (employeeList) {
            return employeeList.map(function(employee) {
                return {
                    title: employee.designation || '',
                    name: (employee.firstname && employee.lastname)? employee.firstname.concat(' ', employee.lastname) : '',
                    location: employee.workcity || '',
                    picture: appData.imagePath.concat(employee.id, appData.imageExt),
                    profileUrl: '#' + employee.url
                };
            });
        };

        $scope.updatePage = function () {
            $scope.currentPage++;
            $scope.pageSize = $scope.currentPage * DEFAULT_PAGE_SIZE_STEP;

            setTimeout(function () {
                $scope.$apply(function () {
                    $scope.itemCount = $scope.pageSize;
                });
            }, 1000);
        };

    });
