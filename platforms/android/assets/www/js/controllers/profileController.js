angular.module('directory.controllers.profileController', ['ionic'])
    .controller('profileController', function ($scope, $state, $stateParams, $ionicPopup, $ionicLoading, $q, appData, profileService, searchService, $ionicPlatform) {

        $scope.profileControllerEntry = $state;

        $scope.$on('$ionicView.beforeEnter', function () {
            console.log('In $scope.$on - $ionicView.beforeEnter');
            $scope.loadProfileTimeout(0);
        });

        $ionicPlatform.ready(function() {
          // ready
          // alert("ready");
        });

        $scope.$on('onAppResume', function(){
          console.log('In $ionicPlatform.on - resume');
          if($scope.profileControllerEntry.$current.url.prefix == '/home/profile/'){
              $scope.loadProfileTimeout(0);
          }
        });

        $scope.loadProfileTimeout = function(numRun){
            $ionicLoading.show();
            //$stateParams.id = typeof somevar; //- 401
            //$stateParams.id = null; //- 500
            //$stateParams.id = '123234'; //- 404

            setTimeout(function(){
              if( typeof $stateParams.id  !== "undefined" && !isNaN($stateParams.id) ){
                console.log($stateParams.id);
                $scope.loadProfile($stateParams.id)
                .then(function() {
                  console.log('LoadProfile completed.');
                })
                .catch(function(err) {
                  console.log('LoadProfile failed: ' + err.data.errorMessage);
                  if(err.status == -1){
                    $ionicPopup.alert({
                      title: 'Connection Timeout',
                      template: 'We have lost the connection to NBCUniversal VPN. Please reconnect and try again.',
                      okText: 'OK'
                    });
                  }else{
                    var localMessage = (typeof err.data.errorMessage !== 'undefined') ?  err.data.errorMessage : '';
                    $ionicPopup.alert({
                      title: 'Application Error',
                      template: 'Application error occurred. Error: ' + err.status + ' ' + localMessage,
                      okText: 'OK'
                    });
                  }

                })
                .finally(function() {
                  // Hide loading screen when loaded.
                  $ionicLoading.hide();
                });
              }else if(numRun < 7){
                console.log('LoadProfileTimeout:' + numRun);
                numRun++;
                $scope.loadProfileTimeout(numRun);
              }else{
                console.log('Profile controller failed to initalized within ~1 sec.');
                $ionicLoading.hide();
                $ionicPopup.alert({
                  title: 'Application Error',
                  template: 'Application error occured. Error: 1000',
                  okText: 'OK'
                });
              }
            }, 300);
        };

        /**
         * Load all data for the user's profile.
         *
         * @return {Promise}
         *   A promise for all loading functions.
         */
        $scope.loadProfile = function ($uid) {
            // alert('loading profile');

            // Promise for our loadProfile.
            var promiseEmployee = $q.defer();

            // Defaults in case any loaders fail.
            $scope.directReports = [];
            $scope.managers = [];
            $scope.hrmanagers = [];
            $scope.employee = {};

            // Get Employee
            profileService.getProfile($uid, 0)
            .then(function (result) {
                // Show loading screen.
                $ionicLoading.show();

                // Promises for each subtask.
                var promiseDR = $q.defer(),
                    promiseHR = $q.defer(),
                    promiseMgr = $q.defer();

                // Transform to a predictable state.
                $scope.employee = $scope.transform(result);
                console.log("Employee", $scope.employee);

                // Direct Reports
                searchService.searchBySupervisor($uid)
                .then(function (result) {
                    $scope.directReports = result;
                    console.log("Direct Reports", $scope.directReports);
                    promiseDR.resolve();
                })
                .catch(function (error) {
                    promiseDR.reject(error);
                });

                // Managers
                // Modify this code to test for the values of the flag
                // based on that either call the services or return empty
                if($scope.employee.personTypeId && $scope.employee.personTypeId != 'Q' && $scope.employee.personTypeId != 'K' && $scope.employee.personTypeId != 'R' && $scope.employee.personTypeId != 'P') {
                    searchService.searchById($scope.employee.manager.managerId)
                    .then(function (result) {
                        $scope.managers = result;
                        console.log("Managers",$scope.managers);
                        promiseMgr.resolve();
                    })
                    .catch(function (error) {
                        promiseMgr.reject(error);
                    });
                }else{
                    $scope.managers = {};
                    console.log("Managers hidden",$scope.managers);
                    promiseMgr.resolve();
                }

                // HR Managers
                console.log("Flag", $scope.employee);
                if($scope.employee.personTypeId && $scope.employee.personTypeId != 'Q' && $scope.employee.personTypeId != 'K' && $scope.employee.personTypeId != 'R') {
                  if (($scope.employee.hrmanager) || ($scope.employee.hrmanager)) {
                    searchService.searchById($scope.employee.hrmanager.custom_hrmanagerid)
                    .then(function (result) {
                        $scope.hrmanagers = result;
                        console.log("HR Managers", $scope.hrmanagers);
                        promiseHR.resolve();
                    })
                    .catch(function (error) {
                        promiseHR.reject(error);
                    });
                    }
                    else {
                        // If none to resolve, make sure to resolve,
                        // so Promise.all will fire.
                        promiseHR.resolve();
                    }
                }else{
                    $scope.hrmanagers = {};
                    console.log("HR Managers hidden", $scope.hrmanagers);
                    promiseHR.resolve();
                }

                // Only resolve once all operations have completed.
                $q.all([promiseDR, promiseHR, promiseMgr])
                .then(function allLoadThen() {
                    promiseEmployee.resolve();
                })
                .catch(function allLoadCatch(err) {
                    promiseEmployee.reject({
                        'status': 1001,
                        'data': "Direct report, HR or manager calls failed."
                    });
                });

                // Hide loading screen when loaded.
                $ionicLoading.hide();
            })
            .catch(function employeeCatch(error) {
                promiseEmployee.reject(error);

                // Hide loading screen when loaded.
                $ionicLoading.hide();
            });

            return promiseEmployee.promise;
        };


        /**
         * Prepare incoming data as an employee object.
         *
         * @param  {object} result
         *   The data passed from an employee ajax lookup response.
         *
         * @return {object}
         *   A cleaner, more predictable employee object.
         */
        $scope.transform = function transform(result) {

            console.log('Raw employee:', result);

            var employee = {};
            employee.username = (typeof result.userName !== 'undefined') ? result.userName : null;
            employee.usertype = (typeof result.userType !== 'undefined') ? result.userType : null;
            employee.id = (typeof result.id !== 'undefined') ? result.id : null;
            employee.manager = (typeof result.manager !== 'undefined') ? result.manager : null;
            employee.hrmanager = (typeof result.custom_hrmanager !== 'undefuned') ? result.custom_hrmanager : null;
            employee.name = {
                full: (typeof result.name !== 'undefined') ? $scope.getName(result.name) : null,
                familyName: (typeof result.name.familyName !== 'undefined') ? result.name.familyName : null,
                givenName: (typeof result.name.givenName !== 'undefined') ? result.name.givenName : null,
                middleName: (typeof result.name.middleName !== 'undefined') ? result.name.middleName : null,
                formatted: (typeof result.name.formatted !== 'undefined') ? result.name.formatted : null
            }
            employee.emails = (typeof result.emails !== 'undefined') ? result.emails : null;

            employee.title = prepareTitle(result);
            employee.organization = {
                segment: (typeof result.custom_orgsegment !== 'undefined') ? result.custom_orgsegment : null,
                name: (typeof result.custom_orgname !== 'undefined') ? result.custom_orgname : null
            };
            employee.phoneNumbers = (typeof result.phoneNumbers !== 'undefined') ? preparePhones(result.phoneNumbers) : null;
            employee.personTypeId = (typeof result.personTypeId !== 'undefined') ? result.personTypeId : null;
            /**

               @TODO

             */
            employee.addresses = (typeof result.addresses !== 'undefined') ? prepareAddresses(result.addresses) : null;

            return employee;
        }

        $scope.getName = function (name) {
            var setName = "";
            if (name != undefined) {
                setName = name.givenName + ' ' + name.familyName;
            }
            return setName;
        };

        $scope.getPicture = function (id) {
            return appData.imagePath + id + appData.imageExt;
        };

        $scope.getProfileURL = function (id) {
            return "#/home/profile/" + id;
        };


        $scope.getAddress = function (address) {
            return assembleAddress(address);
        };

        $scope.getMapsAddress = function (address) {
            return assembleAddress(address, true);
        };

        /**
         * Public wrapper for assembleAddressLocalityRegion().
         *
         * @param  {object} address
         *   An address where this data lives.
         *
         * @return {String}
         *   A formatted string, if set. Otherwise, blank.
         */
        $scope.getAddressLocalityRegion = function (address) {
            return assembleAddressLocalityRegion(address);
        }


        $scope.getTitle = function (employee) {
            var setTitle = "";
            if (employee != undefined) {
                setTitle = employee.title;
            }

            console.log(JSON.stringify(employee));

            return setTitle;
        };

        // $scope.getOrgSegment = function (org_segment) {
        //     var setOrgSegment = "";
        //     if (org_segment != undefined) {
        //         setTitle = org_segment;
        //     }
        //     return setOrgSegment;
        // };

        $scope.getLocation = function (address) {
            var setLocation = "";
            if (address != undefined) {
                if (address.type == "work") {
                    setLocation = address.locality;
                }
            }
            return setLocation;
        };

        $scope.getOfficeNumber = function (number) {
            var setOffice = "";
            if (number != undefined) {
                if (number.type == "work") {
                    setOffice = number.value;
                }
            }
            return setOffice;
        };

        $scope.getMobileNumber = function (number) {
            var setMobile = null;
            if (number != undefined) {
                if (number.type == "mobile") {
                    setMobile = number.value;
                }
            }
            return setMobile;
        };

        $scope.getEmail = function (email) {
            var setEmail = "";
            if (email != undefined) {
                if (email.type == "work") {
                    setEmail = email.value;
                }
            }
            return setEmail;
        };

        $scope.getTeam = function (name) {
            var setTeam = "";
            if (name != undefined) {
                if (name.givenName.endsWith("s")) {
                    setTeam = name.givenName + "' Team";
                } else {
                    setTeam = name.givenName + "'s Team";
                }
            }
            return setTeam;
        };

        $scope.getJabber = function (email) {
            var setJabber = "";
            if (email != undefined) {
                if (email.type == "work") {
                    var splitEmail = email.value.split("@");
                    setJabber = splitEmail[0];
                }
            }
            return setJabber;
        };

        $scope.getTeamMemberName = function (employee) {
            var setName = null;
            if (employee != undefined) {
                if (employee.firstname != undefined && employee.lastname != undefined) {
                    setName = employee.firstname + ' ' + employee.lastname;
                }
            }
            return setName;
        };

        $scope.getTeamMemberTitle = function (employee) {
            var setTitle = null;
            if (employee != undefined) {
                if (employee.designation != undefined) {
                    setTitle = employee.designation;
                }
            }
            return setTitle;
        };

        $scope.getTeamMemberLocation = function (employee) {
            var setLocation = null;
            if (employee != undefined) {
                if (employee.workcity != undefined) {
                    setLocation = employee.workcity;
                }
            }
            return setLocation;
        };

        $scope.actionSendEmail = function (email) {
            if (email != undefined) {
                if (email.type == "work") {
                    window.open("mailto:" + email.value);
                }
            }
        };

        $scope.actionSendJabber = function (email) {
          console.log(email.value);
          console.log("test");
            if (email != undefined) {
              console.log("test2");
                if (email.type == "work") {
                  console.log("test3");
                    // var splitEmail = email.value.split("@");
                    window.open("xmpp://" + email.value);
                }
            }
        };

        $scope.actionGetDirections = function (address) {
            if (address != undefined) {
                var destination = address.streetAddress + " " + address.locality + ", " + address.region + " " + address.postalCode;
                // window.open("http://maps.google.com/?q=" + destination, "_system");
                var isIOS = ionic.Platform.isIOS();
                var isAndroid = ionic.Platform.isAndroid();

                if (isIOS) {
                  window.open('maps://?q=' + destination, '_system');
                } else if (isAndroid) {
                  window.open('geo://0,0?q=' + destination, '_system');
                }
            }
        };

        $scope.actionCallPhone = function (number) {
            console.log(number);
            if (number != undefined) {
                window.open("tel:" + number);
            }
        };




        /**
         * Prepare/format a city/state line of an address.
         *
         * @param  {object} address
         *   An address where this data lives.
         *
         * @return {String}
         *   A formatted string, if set. Otherwise, blank.
         */
        function assembleAddressLocalityRegion(address) {
            var setAddress = '';

            if (typeof address === 'undefined' || address === null) {
                return setAddress;
            }

            setAddress += (address.locality) ? address.locality : '';
            setAddress += (address.locality && address.region) ? ', ' : '';
            setAddress += (address.region) ? address.region : '';

            return setAddress.trim();
        }


        /**
         * Assemble an address with proper checking for missing data.
         *
         * @param  {object} address
         *   An address where this data lives.
         * @param  {boolean} search
         *   Should we process this for a map address query?
         *
         * @return {string}
         *   Formattedd adress, with whatever information was available.
         */
        function assembleAddress(address, search) {
            var setAddress = "";

            if (typeof address !== 'undefined') {
                var zip_code = (typeof address.postalCode === 'string') ? address.postalCode.split("-") : '';
                setAddress = (typeof address.streetAddress === 'string') ? address.streetAddress : '';

                // City / State
                if (typeof address.locality !== 'undefined' || typeof address.region !== 'undefined') {
                    setAddress += (search === true) ? "," : " ";
                    setAddress += assembleAddressLocalityRegion(address);
                }

                // Zip code
                if (typeof zip_code[0] !== 'undefined') {
                    setAddress += (setAddress.length > 0) ? ', ' : '';
                    setAddress += zip_code[0];
                }

                // Cleanup any wrapping whitespace.
                setAddress = setAddress.trim();
            }

            return setAddress;
        }


        /**
         * Prepare an employee's job title.
         *
         * @param  {object} employee
         *   The entire employee object.
         *
         * @return {string|null}
         */
        function prepareTitle(employee) {
            var title = null;
            if (typeof employee !== 'object' || employee === null) {
                console.warn('getJobTitle', 'Employee object not set.');
            }
            else if (employee.title) {
                title = employee.title;
            }
            else if (employee.custom_jobTitle) {
                title = employee.custom_jobTitle;
            }

            return title;
        }


        /**
         * Clean up, and properly assemble all incoming addresses.
         *
         * @param  {object} addresses
         *   Incoming address data from a raw employee result.
         *
         * @return {array}
         *   Array of addresses.
         */
        function prepareAddresses(addresses) {
            if (typeof addresses === 'object' && Array.isArray(addresses)) {
                for (var i = 0; i < addresses.length; i++) {
                    if (typeof addresses[i].streetAddress !== 'undefined'
                        || typeof addresses[i].locality !== 'undefined'
                        || typeof addresses[i].region !== 'undefined'
                        || typeof addresses[i].postalCode !== 'undefined'
                    ) {
                        addresses[i].hasStreetAddress = true;
                    }
                    else {
                        addresses[i].hasStreetAddress = false;
                    }
                }
            }
            return addresses;
        }

        /**
         * Clean up, and properly index all incoming phone numbers.
         *
         * @param  {object} phones
         *   Incoming phone data from a raw employee result.
         *
         * @return {object}
         *   Object of phone numbers, keyed by type. Each type will have
         *   an array of zero or more phone strings.
         */
        function preparePhones(phones) {
            var results = {};
            if (typeof phones === 'object' && Array.isArray(phones)) {

                for (var i = 0; i < phones.length; i++) {
                    if (typeof phones[i].value === 'undefined') {
                        console.warn('Malformed phone data');
                        continue;
                    }
                    if (typeof results[phones[i].type] === 'undefined') {
                        results[phones[i].type] = [];
                    }

                    if (typeof phones[i].value === 'string' ) {
                        results[phones[i].type].push(phones[i].value);
                    }
                    else if (typeof phones[i].value === 'object' && Array.isArray(phones[i].value)) {
                        for (var j = 0; j < phones[i].value.length; j++) {
                            if (typeof phones[i].value[j] === 'string') {
                                results[phones[i].type].push(phones[i].value[j]);
                            }
                            else if (typeof phones[i].value[j].value === 'string') {
                                results[phones[i].type].push(phones[i].value[j].value);
                            }
                            else {
                                console.warn('Encountered invalid phone data format.');
                            }

                            /**

                             @TODO
                                Source data is gross. Which do these apply to?

                             authphone:
                             fax:
                             personalMobile:
                             mobile:
                             work:
                             */
                        }
                    }
                    else {
                        console.warn('Encountered invalid phone data format.');
                    }
                }
            }

            return results;
        }

    });
